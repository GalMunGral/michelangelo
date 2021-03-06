import { Display } from "./Display.js";
import { MouseClickEvent } from "./Event.js";
import { Rect } from "./Geometry.js";
import { Observable } from "./Observable.js";
export class View {
    constructor(config) {
        this.contentFrame = new Rect(0, 0, 0, 0);
        this.frame = new Rect(0, 0, 0, 0);
        this.outerFrame = new Rect(0, 0, 0, 0);
        this.isLayoutRoot = false;
        this.children = [];
        this._props = {
            visible: true,
            dimension: [0, 0],
            margin: [-1, -1, -1, -1],
            weight: 0,
            backgroundColor: [0, 0, 0, 0],
            borderColor: [0, 0, 0, 0],
            shadowColor: [0, 0, 0, 0],
            borderWidth: 1,
            borderRadius: [0, 0, 0, 0],
            shadowOffset: [0, 0],
            shadowBlur: 0,
            padding: [0, 0, 0, 0],
            fontFamily: "Helvetica",
            textAlign: "center",
            color: [0, 0, 0, 1],
            fontSize: 16,
            fontWeight: 400,
        };
        if (config.children) {
            this.children = config.children;
            delete config.children;
        }
        for (let key of Object.keys(config)) {
            const init = config[key];
            if (init instanceof Observable) {
                init.subscribe((v) => {
                    this.props[key] = v;
                });
            }
            else {
                this._props[key] = init;
            }
        }
    }
    get translateX() {
        return 0;
    }
    get translateY() {
        return 0;
    }
    get deviceProps() {
        const props = clone(this.props);
        for (let key of ["borderWidth", "shadowBlur", "fontSize"]) {
            props[key] *= window.devicePixelRatio;
        }
        for (let key of [
            "dimension",
            "margin",
            "borderRadius",
            "shadowOffset",
            "padding",
        ]) {
            props[key] = props[key].map((x) => x * window.devicePixelRatio);
        }
        return props;
    }
    get props() {
        const view = this;
        return new Proxy(this._props, {
            set(target, prop, value, receiver) {
                if (value == Reflect.get(target, prop, receiver))
                    return true;
                try {
                    return Reflect.set(target, prop, value, receiver);
                }
                finally {
                    if (Display.instance) {
                        if (prop == "visible" ||
                            prop == "dimension" ||
                            prop == "margin" ||
                            prop == "weight" ||
                            prop == "fontFamily") {
                            queueMicrotask(() => {
                                var _a;
                                view.layoutRoot.parent.layout();
                                (_a = view.layoutRoot.parent) === null || _a === void 0 ? void 0 : _a.children.forEach((child) => {
                                    child.redraw();
                                });
                            });
                        }
                        else {
                            queueMicrotask(() => {
                                view.redraw();
                            });
                        }
                    }
                }
            },
        });
    }
    get contentWidth() {
        const props = this.deviceProps;
        return this.frame.width - props.padding[1] - props.padding[3];
    }
    get contentHeight() {
        const props = this.deviceProps;
        return this.frame.height - props.padding[0] - props.padding[2];
    }
    redraw() {
        if (!this.layoutRoot.ctx)
            return;
        const { x, y, width, height } = this.outerFrame;
        this.layoutRoot.ctx.clearRect(x, y, width, height);
        this.layoutRoot.ctx.save();
        this.layoutRoot.draw(this.layoutRoot.ctx, this.outerFrame);
        this.layoutRoot.ctx.restore(); // ?
        let visible = this.outerFrame;
        for (let cur = this.parent; cur; cur = cur.parent) {
            visible = visible.translate(cur.translateX, cur.translateY);
        }
        Display.instance.compose(visible);
    }
    get layoutRoot() {
        let cur = this;
        while (cur.parent && !cur.parent.isLayoutRoot)
            cur = cur.parent;
        return cur;
    }
    draw(ctx, dirty, recursive = false) {
        this.ctx = ctx;
        const { backgroundColor, borderColor, shadowColor, shadowOffset, shadowBlur, borderWidth: bw, borderRadius, } = this.deviceProps;
        const { x, y, width, height } = this.frame;
        const [r0, r1, r2, r3] = borderRadius;
        // if (dirty) {
        //   ctx.beginPath();
        //   ctx.rect(dirty.x, dirty.y, dirty.width, dirty.height);
        //   ctx.clip();
        // }
        //@ts-ignore
        if (this.__proto__.constructor.name == "HScroll") {
            // ctx.fillStyle = "red";
            // ctx.fillRect(
            //   this.frame.x,
            //   this.frame.y,
            //   this.frame.width,
            //   this.frame.height
            // );
        }
        ctx.shadowColor = "rgba(" + shadowColor.join(",") + ")";
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffset[0];
        ctx.shadowOffsetY = shadowOffset[1];
        ctx.fillStyle = "rgba(" + backgroundColor.join(",") + ")";
        ctx.strokeStyle = "rgba(" + borderColor.join(",") + ")";
        ctx.lineWidth = bw;
        ctx.beginPath();
        ctx.moveTo(x + r0, y - bw / 2);
        ctx.lineTo(x + width - r1, y - bw / 2);
        ctx.arcTo(x + width + bw / 2, y - bw / 2, x + width + bw / 2, y + r1, r1 + bw / 2);
        ctx.lineTo(x + width + bw / 2, y + height - r2);
        ctx.arcTo(x + width + bw / 2, y + height + bw / 2, x + width - r2, y + height + bw / 2, r2 + bw / 2);
        ctx.lineTo(x + r3, y + height + bw / 2);
        ctx.arcTo(x - bw / 2, y + height + bw / 2, x - bw / 2, y + height - r3, r3 + bw / 2);
        ctx.lineTo(x - bw / 2, y + r0);
        ctx.arcTo(x - bw / 2, y - bw / 2, x + r0, y - bw / 2, r0 + bw / 2);
        ctx.stroke();
        const p = new Path2D();
        p.moveTo(x + r0, y);
        p.lineTo(x + width - r1, y);
        p.arcTo(x + width, y, x + width, y + r1, r1);
        p.lineTo(x + width, y + height - r2);
        p.arcTo(x + width, y + height, x + width - r2, y + height, r2);
        p.lineTo(x + r3, y + height);
        p.arcTo(x, y + height, x, y + height - r3, r3);
        p.lineTo(x, y + r0);
        p.arcTo(x, y, x + r0, y, r0);
        ctx.fill(p);
        ctx.clip(p);
    }
    handle(e) {
        var _a, _b;
        if (e instanceof MouseClickEvent) {
            (_b = (_a = this.props).onClick) === null || _b === void 0 ? void 0 : _b.call(_a, e);
        }
    }
    destruct() { }
}
function clone(o) {
    const res = {};
    for (let key of Object.keys(o)) {
        if (Array.isArray(key)) {
            res[key] = [...o[key]];
        }
        else {
            res[key] = o[key];
        }
    }
    return res;
}
