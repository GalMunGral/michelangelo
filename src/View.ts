import { Display } from "./Display.js";
import { Event, MouseClickEvent } from "./Event.js";
import { Rect } from "./Geometry.js";
import { Observable } from "./Observable.js";
import { shallowEqual } from "./util.js";

export type vec4 = [number, number, number, number];
export type vec2 = [number, number];

export type ViewProps = {
  visible: boolean;
  dimension: vec2;
  margin: vec4;
  weight: number;
  backgroundColor: vec4;
  borderColor: vec4;
  borderRadius: vec4;
  borderWidth: number;
  shadowColor: vec4;
  shadowOffset: vec2;
  shadowBlur: number;
  padding: vec4;
  fontFamily: string;
  textAlign: "start" | "center";
  fontSize: number;
  fontWeight: number;
  color: vec4;
  onClick?: (e: MouseClickEvent) => void;
};

export type ViewConfig<C = any> = Partial<{
  [K in keyof ViewProps]: ViewProps[K] | Observable<ViewProps[K]>;
}> & { children?: Array<C> };

export abstract class View<C = any> {
  public ctx?: CanvasRenderingContext2D;
  public contentFrame: Rect = new Rect(0, 0, 0, 0);
  public frame: Rect = new Rect(0, 0, 0, 0);
  public outerFrame: Rect = new Rect(0, 0, 0, 0);
  public isLayoutRoot = false;
  public parent?: View<View>;
  public children: Array<C> = [];

  private _props: ViewProps = {
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

  get translateX() {
    return 0;
  }

  get translateY() {
    return 0;
  }

  constructor(config: ViewConfig<C>) {
    if (config.children) {
      this.children = config.children;
      delete config.children;
    }
    for (let key of Object.keys(config) as Array<keyof ViewProps>) {
      const init = config[key];
      if (init instanceof Observable) {
        init.subscribe((v) => {
          (this.props[key] as any) = v;
        });
      } else {
        (this._props[key] as any) = init;
      }
    }
  }

  private path: string = "";
  public setDebugPath(path: string) {
    this.path = path;
  }

  get deviceProps(): ViewProps {
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
      props[key] = props[key].map((x: number) => x * window.devicePixelRatio);
    }
    return props;
  }

  public layoutScheduled = false;
  public redrawScheduled = false;

  get props(): ViewProps {
    const view = this;
    return new Proxy(this._props, {
      set(target, prop, value, receiver) {
        if (shallowEqual(value, Reflect.get(target, prop, receiver))) {
          return true;
        }
        try {
          return Reflect.set(target, prop, value, receiver);
        } finally {
          if (Display.instance) {
            if (
              prop == "visible" ||
              prop == "dimension" ||
              prop == "margin" ||
              prop == "weight" ||
              prop == "fontFamily"
            ) {
              if (!view.layoutScheduled) {
                view.layoutScheduled = true;
                queueMicrotask(() => {
                  view.layoutScheduled = false;
                  view.layoutRoot.parent!.layout();
                  view.layoutRoot.parent?.children.forEach((child) => {
                    child.redraw(`layout ${prop} changed`);
                  });
                });
              }
            } else {
              if (!view.redrawScheduled) {
                view.redrawScheduled = true;
                queueMicrotask(() => {
                  view.redrawScheduled = false;
                  view.redraw(`style ${prop.toString()} changed`);
                });
              }
            }
          }
        }
      },
    });
  }

  protected get contentWidth(): number {
    const props = this.deviceProps;
    return this.frame.width - props.padding[1] - props.padding[3];
  }

  protected get contentHeight(): number {
    const props = this.deviceProps;
    return this.frame.height - props.padding[0] - props.padding[2];
  }

  public abstract layout(): void;

  public redraw(reason?: string) {
    // console.debug(this.path, reason);
    if (!this.layoutRoot.ctx) return;
    const { x, y, width, height } = this.outerFrame;
    this.layoutRoot.ctx.clearRect(x, y, width, height);
    this.layoutRoot.ctx.save();
    this.layoutRoot.draw(this.layoutRoot.ctx!, this.outerFrame);
    this.layoutRoot.ctx.restore(); // ?
    let visible = this.outerFrame;
    for (let cur = this.parent; cur; cur = cur.parent) {
      visible = visible.translate(cur.translateX, cur.translateY);
    }
    Display.instance.compose(visible);
  }

  get layoutRoot(): View {
    let cur: View = this;
    while (cur.parent && !cur.parent.isLayoutRoot) cur = cur.parent;
    return cur;
  }

  draw(ctx: CanvasRenderingContext2D, dirty: Rect, recursive = false) {
    this.ctx = ctx;
    const {
      backgroundColor,
      borderColor,
      shadowColor,
      shadowOffset,
      shadowBlur,
      borderWidth: bw,
      borderRadius,
    } = this.deviceProps;

    const { x, y, width, height } = this.frame;
    const [r0, r1, r2, r3] = borderRadius;

    if (dirty) {
      ctx.beginPath();
      ctx.rect(dirty.x, dirty.y, dirty.width, dirty.height);
      ctx.clip();
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
    ctx.arcTo(
      x + width + bw / 2,
      y - bw / 2,
      x + width + bw / 2,
      y + r1,
      r1 + bw / 2
    );
    ctx.lineTo(x + width + bw / 2, y + height - r2);
    ctx.arcTo(
      x + width + bw / 2,
      y + height + bw / 2,
      x + width - r2,
      y + height + bw / 2,
      r2 + bw / 2
    );
    ctx.lineTo(x + r3, y + height + bw / 2);
    ctx.arcTo(
      x - bw / 2,
      y + height + bw / 2,
      x - bw / 2,
      y + height - r3,
      r3 + bw / 2
    );
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

  public handle(e: Event): void {
    if (e instanceof MouseClickEvent) {
      this.props.onClick?.(e);
    }
  }

  public destruct(): void {}
}

function clone(o: any) {
  const res: any = {};
  for (let key of Object.keys(o)) {
    if (Array.isArray(key)) {
      res[key] = [...o[key]];
    } else {
      res[key] = o[key];
    }
  }
  return res;
}
