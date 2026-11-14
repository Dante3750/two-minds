package io.github.dante3750.twominds;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Two Minds for Android: a full-screen WebView around the web game.
 *
 * The page always lives at its public address, so links made in the app open for people in a browser
 * and links from a browser open in the app. The page itself comes from, in this order:
 *   1. the last copy fetched from the live site (refreshed in the background on every launch, so game updates
 *      arrive one launch later without a new APK),
 *   2. the copy bundled inside the APK (works on first launch with no internet).
 * Either way the app opens without waiting for the network.
 */
public class MainActivity extends Activity {
    static final String BASE = "https://dante3750.github.io/two-minds/";
    static final String MARKER = "TwoMindsNative";
    static final Pattern LINK = Pattern.compile("https://dante3750\\.github\\.io/two-minds/[^\\s#]*#[cLF]=[A-Za-z0-9_-]+");

    private WebView web;
    private FrameLayout root;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF140D1F);
        web = new WebView(this);
        web.setBackgroundColor(0xFF140D1F);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // keep the page clear of the status bar, the navigation bar and the keyboard on every Android version
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                if (Build.VERSION.SDK_INT >= 30) {
                    android.graphics.Insets s = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                    v.setPadding(s.left, s.top, s.right, s.bottom);
                } else {
                    v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
                }
                return insets;
            }
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " TwoMindsApp/" + versionCode());

        web.addJavascriptInterface(new Bridge(), MARKER);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new Client());

        String link = linkFrom(getIntent());
        web.loadUrl(link != null ? link : BASE);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String link = linkFrom(intent);
        if (link != null) web.loadUrl(link);      // same page, new #fragment: the game sees it as a tapped link
    }

    /** A game link from a tapped URL or from text shared to the app, or null. */
    private static String linkFrom(Intent intent) {
        if (intent == null) return null;
        String text = null;
        if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) text = intent.getData().toString();
        else if (Intent.ACTION_SEND.equals(intent.getAction())) text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null) return null;
        Matcher m = LINK.matcher(text);
        return m.find() ? m.group() : null;
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();      // the game walks back through its own screens
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }

    private long versionCode() {
        try {
            android.content.pm.PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(1 << 19);
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }

    private volatile boolean refreshing;

    /**
     * The page, without waiting for the network: the last copy fetched from the live site if there is one,
     * otherwise the copy bundled in the APK. A fresh copy is fetched in the background for the next launch.
     */
    private byte[] page() {
        File cache = new File(getFilesDir(), "index-" + versionCode() + ".html");
        byte[] local = null;
        try {
            if (cache.length() > 50000) local = readAll(new FileInputStream(cache));
        } catch (Exception ignored) { }
        if (local == null) {
            try {
                local = readAll(getAssets().open("www/index.html"));
            } catch (Exception ignored) { }
        }
        refreshLater(cache);
        if (local != null) return local;
        byte[] live = fetchLive();
        if (live != null) return live;
        return "<meta name=viewport content='width=device-width'><body style='background:#140d1f;color:#fff;font:16px sans-serif;padding:32px'>Two Minds could not load. Please reinstall the app.".getBytes(StandardCharsets.UTF_8);
    }

    /** The live site's page, only if it is reachable and is a build that knows about this app. */
    private static byte[] fetchLive() {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(BASE + "index.html").openConnection();
            c.setConnectTimeout(5000);
            c.setReadTimeout(10000);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) return null;
            byte[] live = readAll(c.getInputStream());
            return live.length > 50000 && new String(live, StandardCharsets.UTF_8).contains(MARKER) ? live : null;
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private void refreshLater(final File cache) {
        if (refreshing) return;
        refreshing = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] live = fetchLive();
                    if (live == null) return;
                    File tmp = new File(cache.getPath() + ".tmp");
                    FileOutputStream f = new FileOutputStream(tmp);
                    f.write(live);
                    f.close();
                    if (!tmp.renameTo(cache)) tmp.delete();
                    File[] all = getFilesDir().listFiles();      // copies kept by older versions of the app
                    if (all != null) for (File o : all) if (o.getName().startsWith("index-") && !o.getName().equals(cache.getName())) o.delete();
                } catch (Exception ignored) {
                } finally {
                    refreshing = false;
                }
            }
        }).start();
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (uri.toString().startsWith(BASE)) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));     // WhatsApp, browser…
            } catch (ActivityNotFoundException ignored) { }
            return true;
        }

        /** If Android kills the page's process (low memory), start the screen again instead of crashing. */
        @Override
        public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
            recreate();
            return true;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (!"GET".equals(request.getMethod())) return null;
            String url = request.getUrl().toString();
            int cut = url.indexOf('#');
            if (cut >= 0) url = url.substring(0, cut);
            cut = url.indexOf('?');
            if (cut >= 0) url = url.substring(0, cut);
            if (!url.startsWith(BASE)) return null;
            String path = url.substring(BASE.length());
            try {
                if (path.isEmpty() || path.equals("index.html")) {
                    WebResourceResponse r = new WebResourceResponse("text/html", "utf-8", new ByteArrayInputStream(page()));
                    java.util.HashMap<String, String> h = new java.util.HashMap<String, String>();
                    h.put("Cache-Control", "no-store");
                    r.setResponseHeaders(h);
                    return r;
                }
                if (path.equals("manifest.webmanifest")) return new WebResourceResponse("application/manifest+json", "utf-8", getAssets().open("www/" + path));
                if (path.equals("icon-192.png") || path.equals("icon-512.png")) return new WebResourceResponse("image/png", null, getAssets().open("www/" + path));
            } catch (Exception ignored) { }
            return null;
        }
    }

    /** What the page can ask the phone to do. Only the game's own page is ever loaded in this WebView. */
    public class Bridge {
        @JavascriptInterface
        public void share(String text) {
            Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(send, "Send with"));
        }

        @JavascriptInterface
        public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Two Minds", text));
        }

        /** Match the system bars to the game's theme. */
        @JavascriptInterface
        public void theme(final String hex, final boolean light) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    int color;
                    try {
                        color = Color.parseColor(hex);
                    } catch (Exception e) {
                        return;
                    }
                    root.setBackgroundColor(color);
                    Window w = getWindow();
                    w.setStatusBarColor(color);
                    w.setNavigationBarColor(color);
                    View d = w.getDecorView();
                    int flags = d.getSystemUiVisibility();
                    int lightFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0);
                    d.setSystemUiVisibility(light ? (flags | lightFlags) : (flags & ~lightFlags));
                }
            });
        }
    }
}
