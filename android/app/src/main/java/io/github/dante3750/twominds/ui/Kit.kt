package io.github.dante3750.twominds.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.dante3750.twominds.data.initial
import io.github.dante3750.twominds.data.levelOf

val pal @Composable get() = LocalPalette.current

// ---------------------------------------------------------------- icons
private val iconCache = HashMap<String, ImageVector>()
private fun vectorFor(name: String, stroke: Float): ImageVector = iconCache.getOrPut("$name/$stroke") {
    val parts = ICON_PATHS[name] ?: ICON_PATHS.getValue("star")
    ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
        parts.forEach { (d, filled) ->
            addPath(addPathNodes(d), fill = if (filled) SolidColor(Color.Black) else null,
                stroke = if (filled) null else SolidColor(Color.Black), strokeLineWidth = stroke, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round)
        }
    }.build()
}

@Composable
fun Icon(name: String, size: Dp = 22.dp, color: Color = pal.ink, stroke: Float = 1.9f) {
    Image(rememberVectorPainter(vectorFor(name, stroke)), contentDescription = null, modifier = Modifier.size(size), colorFilter = ColorFilter.tint(color))
}

// ---------------------------------------------------------------- text
@Composable
fun Txt(
    text: String, modifier: Modifier = Modifier, size: TextUnit = 15.sp, weight: FontWeight = FontWeight.Normal, color: Color = pal.ink,
    align: TextAlign? = null, lines: Int = Int.MAX_VALUE, display: Boolean = false, spacing: TextUnit = TextUnit.Unspecified, lineHeight: TextUnit = TextUnit.Unspecified,
) {
    androidx.compose.foundation.text.BasicText(
        text, modifier,
        style = TextStyle(fontFamily = if (display) Display else Lexend, fontWeight = weight, fontSize = size, color = color,
            textAlign = align ?: TextAlign.Unspecified, letterSpacing = spacing, lineHeight = lineHeight),
        maxLines = lines, overflow = TextOverflow.Ellipsis,
    )
}
@Composable fun H1(text: String, modifier: Modifier = Modifier, align: TextAlign? = null) = Txt(text, modifier, 26.sp, FontWeight.Bold, align = align, spacing = (-0.5).sp, lines = 2)
@Composable fun H2(text: String, modifier: Modifier = Modifier, align: TextAlign? = null) = Txt(text, modifier, 19.sp, FontWeight.Bold, align = align, lines = 2)
@Composable fun Small(text: String, modifier: Modifier = Modifier, align: TextAlign? = null, color: Color = pal.muted, lines: Int = Int.MAX_VALUE) = Txt(text, modifier, 13.sp, color = color, align = align, lineHeight = 19.sp, lines = lines)
@Composable fun Label(text: String, modifier: Modifier = Modifier) = Txt(text.uppercase(), modifier, 11.5.sp, FontWeight.Medium, pal.muted, spacing = 1.2.sp)

// ---------------------------------------------------------------- press feedback
@Composable
fun Modifier.press(enabled: Boolean = true, sound: Boolean = true, label: String? = null, onClick: () -> Unit): Modifier {
    val src = remember { MutableInteractionSource() }
    val down by src.collectIsPressedAsState()
    val s by animateFloatAsState(if (down) 0.96f else 1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy), label = "press")
    return this.scale(s).then(if (label != null) Modifier.semantics { contentDescription = label } else Modifier)
        .clickable(src, indication = null, enabled = enabled) { if (sound) Sfx.play("tap"); onClick() }
}

// ---------------------------------------------------------------- building blocks
@Composable
fun Btn(
    title: String, modifier: Modifier = Modifier, sub: String? = null, kind: String = "plain", icon: String? = null, color: Color? = null,
    busy: Boolean = false, enabled: Boolean = true, height: Dp = 0.dp, onClick: () -> Unit,
) {
    val p = pal
    val bg = when (kind) { "cta" -> color ?: p.gold; "green" -> Color(0xFF25D366); "ghost" -> Color.Transparent; else -> color ?: p.s1 }
    val fg = when (kind) { "cta" -> TILE_INK; "green" -> Color(0xFF04260F); "danger" -> p.bad; else -> p.ink }
    val shape = RoundedCornerShape(if (kind == "cta") 18.dp else 16.dp)
    Row(
        modifier.alpha(if (enabled) 1f else 0.5f).press(enabled && !busy, label = title, onClick = onClick)
            .heightIn(min = if (height > 0.dp) height else if (kind == "cta") 56.dp else 50.dp).clip(shape).background(bg)
            .then(if (kind == "cta" || kind == "green") Modifier else Modifier.border(1.dp, p.line2, shape)).padding(horizontal = 18.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        if (busy) CircularProgressIndicator(Modifier.size(22.dp), color = fg, strokeWidth = 2.5.dp)
        else {
            if (icon != null) { Icon(icon, 18.dp, fg, 2.2f); Spacer(Modifier.width(10.dp)) }
            Column(horizontalAlignment = if (sub != null) Alignment.Start else Alignment.CenterHorizontally) {
                Txt(title, size = if (kind == "cta") 16.sp else 14.5.sp, weight = FontWeight.Bold, color = fg, lines = 1)
                if (sub != null) Txt(sub, size = 12.sp, color = fg.copy(alpha = 0.7f), lines = 1)
            }
        }
    }
}


@Composable
fun CardBox(modifier: Modifier = Modifier, border: Color? = null, pad: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    val p = pal; val shape = RoundedCornerShape(22.dp)
    Column(modifier.fillMaxWidth().clip(shape).background(p.s1).border(1.dp, border ?: p.line, shape).padding(pad), verticalArrangement = Arrangement.spacedBy(10.dp), content = content)
}

private val FRAMES = mapOf(
    "bronze" to listOf(0xFFF1B48A, 0xFF9A5A32), "silver" to listOf(0xFFFFFFFF, 0xFF8F9BB3), "gold" to listOf(0xFFFFF2B0, 0xFFE0A400),
    "plat" to listOf(0xFFBFF7F0, 0xFF5FD3C6), "diamond" to listOf(0xFFFF7AA2, 0xFF38D6FF), "flame" to listOf(0xFFFFD166, 0xFFFF2E63),
)

@Composable
fun Avatar(name: String, color: String, size: Dp = 44.dp, frame: String? = null, ring: Boolean = true) {
    val c = hex(color); val fr = frame?.let { FRAMES[it] }; val pad = if (fr != null) maxOf(3.dp, size * 0.07f) else 0.dp
    Box(Modifier.size(size + pad * 2), contentAlignment = Alignment.Center) {
        if (fr != null) Canvas(Modifier.matchParentSize()) {
            drawCircle(Brush.linearGradient(fr.map { Color(it) }), radius = (this.size.minDimension - pad.toPx()) / 2, style = Stroke(pad.toPx()))
        }
        Box(Modifier.size(size).clip(CircleShape).background(c).then(if (ring && fr == null) Modifier.border(maxOf(2.dp, size * 0.05f), c.copy(alpha = 0.45f), CircleShape) else Modifier),
            contentAlignment = Alignment.Center) {
            Txt(initial(name), size = (size.value * 0.42f).sp, color = if (pal.dark) Color(0xFF140D1F) else Color.White, display = true)
        }
    }
}

// avatar with the level progress drawn around it
@Composable
fun LevelAvatar(name: String, color: String, xp: Int, size: Dp = 56.dp, frame: String? = null) {
    val p = pal; val L = levelOf(xp / 3)
    val prog by animateFloatAsState(L.pct, tween(900), label = "lv")
    Box(Modifier.size(size + 12.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            val w = 4.dp.toPx(); val inset = w / 2 + 1
            drawArc(p.line2, 0f, 360f, false, Offset(inset, inset), Size(this.size.width - inset * 2, this.size.height - inset * 2), style = Stroke(w))
            drawArc(p.gold, -90f, 360f * prog, false, Offset(inset, inset), Size(this.size.width - inset * 2, this.size.height - inset * 2), style = Stroke(w, cap = StrokeCap.Round))
        }
        Avatar(name, color, size, frame, ring = false)
        Box(Modifier.align(Alignment.BottomEnd).heightIn(min = 24.dp).widthIn(min = 24.dp).clip(RoundedCornerShape(12.dp)).background(p.s1).padding(3.dp)) {
            Box(Modifier.clip(RoundedCornerShape(10.dp)).background(p.gold).padding(horizontal = 6.dp, vertical = 1.dp), contentAlignment = Alignment.Center) {
                Txt("${L.lv}", size = 11.sp, color = p.goldInk, display = true)
            }
        }
    }
}

@Composable
fun Bar(pct: Float, color: Color = pal.gold, height: Dp = 8.dp, track: Color = pal.line2) {
    val v by animateFloatAsState(pct.coerceIn(0f, 1f), tween(900), label = "bar")
    Box(Modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(height)).background(track)) {
        Box(Modifier.fillMaxHeight().fillMaxWidth(v).clip(RoundedCornerShape(height)).background(color))
    }
}

@Composable
fun Chip(label: String, icon: String? = null, iconColor: Color? = null, active: Boolean = false, onClick: (() -> Unit)? = null) {
    val p = pal; val shape = RoundedCornerShape(999.dp)
    Row(Modifier.then(if (onClick != null) Modifier.press(label = label, onClick = onClick) else Modifier).heightIn(min = 34.dp).clip(shape)
        .background(if (active) p.ink else p.bg).border(1.dp, if (active) p.ink else p.line, shape).padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        if (icon != null) Icon(icon, 15.dp, iconColor ?: p.muted, 2.2f)
        Txt(label, size = 12.5.sp, weight = FontWeight.Medium, color = if (active) p.bg else p.ink2, lines = 1)
    }
}

@Composable
fun Empty(icon: String, title: String, text: String) {
    val p = pal; val shape = RoundedCornerShape(22.dp)
    Column(Modifier.fillMaxWidth().border(1.dp, p.line2, shape).padding(26.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(icon, 30.dp, p.muted); Txt(title, size = 16.sp, weight = FontWeight.Bold); Small(text, align = TextAlign.Center)
    }
}

@Composable
fun SectionHead(title: String, action: String? = null, onAction: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Label(title, Modifier.weight(1f))
        if (action != null) Txt(action, Modifier.press(label = action, onClick = onAction).padding(vertical = 6.dp), 13.sp, FontWeight.Medium, pal.goldText)
    }
}

@Composable
fun Field(value: String, onChange: (String) -> Unit, placeholder: String, modifier: Modifier = Modifier, keyboard: KeyboardType = KeyboardType.Text,
          big: Boolean = false, onDone: (() -> Unit)? = null, tag: String? = null) {
    val p = pal; var focus by remember { mutableStateOf(false) }; val shape = RoundedCornerShape(14.dp)
    BasicTextField(value, onChange,
        modifier.fillMaxWidth().clip(shape).background(p.bg).border(1.dp, if (focus) p.gold else p.line2, shape).padding(horizontal = 14.dp, vertical = 13.dp)
            .onFocusChanged { focus = it.isFocused }.then(if (tag != null) Modifier.semantics { contentDescription = tag } else Modifier),
        singleLine = true, cursorBrush = SolidColor(p.gold),
        textStyle = TextStyle(fontFamily = if (big) Display else Lexend, fontWeight = FontWeight.Medium, fontSize = if (big) 26.sp else 16.sp, color = p.ink,
            textAlign = if (big) TextAlign.Center else TextAlign.Start, letterSpacing = if (big) 10.sp else TextUnit.Unspecified),
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        keyboardActions = KeyboardActions(onDone = { onDone?.invoke() }, onGo = { onDone?.invoke() }, onSend = { onDone?.invoke() }),
        decorationBox = { inner -> Box { if (value.isEmpty()) Txt(placeholder, size = if (big) 18.sp else 16.sp, color = p.muted, align = if (big) TextAlign.Center else null, modifier = Modifier.fillMaxWidth()); inner() } })
}


@Composable
fun IconBtn(icon: String, label: String, badge: Boolean = false, onClick: () -> Unit) {
    val p = pal; val shape = RoundedCornerShape(14.dp)
    Box(Modifier.size(44.dp).press(label = label, onClick = onClick).clip(shape).background(p.s1).border(1.dp, p.line, shape), contentAlignment = Alignment.Center) {
        Icon(icon, color = p.ink2)
        if (badge) Box(Modifier.align(Alignment.TopEnd).padding(8.dp).size(9.dp).clip(CircleShape).background(p.bad))
    }
}

@Composable
fun Pill(text: String, icon: String? = null, color: Color, onDark: Boolean = false) {
    val shape = RoundedCornerShape(999.dp)
    Row(Modifier.clip(shape).background(color.copy(alpha = 0.22f)).border(1.dp, color.copy(alpha = 0.5f), shape).padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        if (icon != null) Icon(icon, 15.dp, if (onDark) Color.White else color)
        Txt(text, size = 12.5.sp, weight = FontWeight.Medium, color = if (onDark) Color.White else pal.ink, lines = 1)
    }
}

/** A scrolling page that respects the status bar, navigation bar and keyboard. */
@Composable
fun Page(tabs: Boolean = false, scroll: Boolean = true, content: @Composable ColumnScope.() -> Unit) {
    val p = pal
    Box(Modifier.fillMaxSize().background(p.bg)) {
        Column(
            Modifier.fillMaxSize().then(if (scroll) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                .windowInsetsPadding(WindowInsets.systemBars.union(WindowInsets.ime))
                .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = if (tabs) 96.dp else 24.dp)
                .widthIn(max = 560.dp).align(Alignment.TopCenter),
            verticalArrangement = Arrangement.spacedBy(16.dp), content = content,
        )
    }
}
val ZeroBorder = BorderStroke(0.dp, Color.Transparent)
