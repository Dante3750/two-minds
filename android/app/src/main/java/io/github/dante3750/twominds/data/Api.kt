package io.github.dante3750.twominds.data

import android.content.Context
import io.github.dante3750.twominds.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiException(message: String, val code: String? = null) : Exception(message)

/**
 * The whole server conversation: email-code sign-in (Supabase Auth) and the game's database functions
 * (Supabase REST "rpc"). Plain HTTPS + org.json, no SDK.
 */
class Api(context: Context) {
    val url = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val key = BuildConfig.SUPABASE_ANON_KEY
    val configured get() = url.startsWith("https://") && key.isNotBlank()

    private val prefs = context.getSharedPreferences("session", Context.MODE_PRIVATE)
    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS).callTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true).build()
    private val json = "application/json".toMediaType()
    private val refreshLock = Mutex()

    var userId: String? = prefs.getString("user", null); private set
    var email: String? = prefs.getString("email", null); private set
    private var access: String? = prefs.getString("access", null)
    private var refresh: String? = prefs.getString("refresh", null)
    private var expiresAt: Long = prefs.getLong("expires", 0)
    val signedIn get() = refresh != null && userId != null

    private fun save(o: JSONObject) {
        access = o.getString("access_token"); refresh = o.getString("refresh_token")
        expiresAt = System.currentTimeMillis() / 1000 + o.optLong("expires_in", 3600) - 60
        val user = o.optJSONObject("user")
        if (user != null) { userId = user.getString("id"); email = user.optString("email", email ?: "") }
        prefs.edit().putString("access", access).putString("refresh", refresh).putLong("expires", expiresAt)
            .putString("user", userId).putString("email", email).apply()
    }

    fun signOut() {
        access = null; refresh = null; userId = null; email = null
        prefs.edit().clear().apply()
    }

    // ---------- sign-in with a 6-digit email code
    suspend fun sendCode(address: String) {
        post("/auth/v1/otp", JSONObject().put("email", address).put("create_user", true), auth = false)
    }

    suspend fun verifyCode(address: String, code: String) {
        val o = post("/auth/v1/verify", JSONObject().put("type", "email").put("email", address).put("token", code), auth = false) as JSONObject
        save(o)
    }

    private suspend fun token(): String? {
        if (refresh == null) return null
        if (access != null && System.currentTimeMillis() / 1000 < expiresAt) return access
        return refreshLock.withLock {
            if (access != null && System.currentTimeMillis() / 1000 < expiresAt) return@withLock access
            try {
                val o = post("/auth/v1/token?grant_type=refresh_token", JSONObject().put("refresh_token", refresh), auth = false) as JSONObject
                save(o); access
            } catch (e: ApiException) {
                if (e.code == "400" || e.code == "401") signOut()       // the sign-in was revoked or expired
                throw e
            }
        }
    }

    // ---------- database functions
    suspend fun rpc(fn: String, args: JSONObject = JSONObject()): Any? = post("/rest/v1/rpc/$fn", args, auth = true)

    suspend fun select(path: String): JSONArray = withContext(Dispatchers.IO) {
        val req = Request.Builder().url("$url/rest/v1/$path").headers(true).get().build()
        parse(execute(req)) as? JSONArray ?: JSONArray()
    }

    private suspend fun post(path: String, body: JSONObject, auth: Boolean): Any? {
        val bearer = if (auth) token() else null
        return withContext(Dispatchers.IO) {
            val req = Request.Builder().url(url + path).apply {
                header("apikey", key); header("Content-Type", "application/json")
                header("Authorization", "Bearer " + (bearer ?: key))
            }.post(body.toString().toRequestBody(json)).build()
            parse(execute(req))
        }
    }

    private suspend fun Request.Builder.headers(auth: Boolean): Request.Builder {
        header("apikey", key)
        header("Authorization", "Bearer " + ((if (auth) token() else null) ?: key))
        return this
    }

    private fun execute(req: Request): Pair<Int, String> {
        if (!configured) throw ApiException("This build isn't connected to the game server yet.")
        try {
            http.newCall(req).execute().use { r -> return r.code to (r.body?.string() ?: "") }
        } catch (e: IOException) {
            throw ApiException("Can't reach the server. Check your internet.", "network")
        }
    }

    private fun parse(res: Pair<Int, String>): Any? {
        val (code, text) = res
        if (code in 200..299) {
            val t = text.trim()
            return when {
                t.isEmpty() || t == "null" -> null
                t.startsWith("{") -> JSONObject(t)
                t.startsWith("[") -> JSONArray(t)
                else -> t.trim('"')
            }
        }
        val o = try { JSONObject(text) } catch (_: Exception) { JSONObject() }
        val msg = o.optString("message").ifBlank { o.optString("msg") }.ifBlank { o.optString("error_description") }.ifBlank { "Something went wrong ($code)" }
        throw ApiException(friendly(msg), if (o.has("code")) o.optString("code") else code.toString())
    }

    private fun friendly(m: String) = when {
        m.contains("rate limit", true) || m.contains("only request this after", true) -> "Too many codes asked for. Wait a minute and try again."
        m.contains("expired", true) || m.contains("invalid", true) && m.contains("otp", true) -> "That code didn't work. Check the newest email, or ask for a new code."
        else -> m
    }
}
