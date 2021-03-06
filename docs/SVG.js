import { Display } from "./Display.js";
import { Fonts } from "./Font.js";
import { View } from "./View.js";
import { MouseUpEvent } from "./Event.js";
export class Text extends View {
    constructor(config) {
        super(config);
        this.lines = [];
        this.content = this.children.join("");
        this.font = Fonts.get(this.props.fontFamily);
        this.unitsPerEm = this.font.unitsPerEm;
        this.fontSize = this.props.size * window.devicePixelRatio;
        this.scale = this.fontSize / this.unitsPerEm;
    }
    handle(e) {
        if (e instanceof MouseUpEvent) {
            e.handled = true;
        }
    }
    layout() {
        this.lines = [];
        const words = this.content.split(/\s+/);
        if (!words.length)
            return;
        const spaceWidth = this.fontSize / 4;
        const getGlyphWidth = (c) => this.font.glyphs[c].width * this.scale;
        const getWordWidth = (word) => word.split("").reduce((w, c) => w + getGlyphWidth(c), 0);
        let line = words.shift();
        let lineWidth = getWordWidth(line);
        for (let word of words) {
            const wordWidth = getWordWidth(word);
            if (lineWidth + spaceWidth + wordWidth > this.contentWidth) {
                this.lines.push(line);
                line = word;
                lineWidth = wordWidth;
            }
            else {
                line += " " + word;
                lineWidth += spaceWidth + wordWidth;
            }
        }
        this.lines.push(line);
    }
    drawGlyph(ctx, glyph) {
        if (!this.font)
            return;
        ctx.beginPath();
        for (let cmd of glyph.outline) {
            switch (cmd.type) {
                case "MOVE_TO":
                    ctx.moveTo(cmd.x, glyph.height - cmd.y);
                    break;
                case "LINE_TO":
                    ctx.lineTo(cmd.x, glyph.height - cmd.y);
                    break;
                case "QUADRATIC_BEZIER":
                    ctx.quadraticCurveTo(cmd.cx, glyph.height - cmd.cy, cmd.x, glyph.height - cmd.y);
                    break;
                case "CLOSE_PATH":
                    ctx.closePath();
                    break;
            }
        }
        ctx.fill();
    }
    draw(dirty) {
        super.draw(dirty);
        const ctx = Display.instance.ctx;
        ctx.save();
        ctx.fillStyle = "rgba(" + this.props.color.join(",") + ")";
        for (let [i, line] of this.lines.entries()) {
            if (this.fontSize * (i + 1) > this.contentHeight)
                break;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.translate(this.frame.x + this.props.padding[3], this.frame.y + this.props.padding[0] + this.fontSize * i);
            ctx.scale(this.scale, this.scale);
            for (let c of line) {
                const glyph = this.font.glyphs[c];
                if (glyph) {
                    // TODO: kerning
                    this.drawGlyph(ctx, glyph);
                    ctx.translate(glyph.width, 0);
                }
                else {
                    // TODO: spaces ?
                    ctx.translate(this.unitsPerEm / 4, 0);
                }
            }
        }
        ctx.restore();
    }
}
