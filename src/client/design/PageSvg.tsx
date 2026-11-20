import { useEffect, useState, type ReactNode } from "react";
import type { DesignElement, DesignPage } from "@/lib/design";

export type ImageHref = (el: Extract<DesignElement, { type: "image" }>) => string | null;

/** One page of a design as SVG, in design pixels. */
export function PageSvg({
  page,
  width,
  height,
  imageHref,
  className,
  overlay,
  renderElement,
  ...rest
}: {
  page: DesignPage;
  width: number;
  height: number;
  imageHref: ImageHref;
  className?: string;
  overlay?: ReactNode;
  renderElement?: (el: DesignElement, node: ReactNode) => ReactNode;
} & Omit<React.SVGProps<SVGSVGElement>, "width" | "height">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      {...rest}
    >
      <rect width={width} height={height} fill={page.background} />
      {page.elements.map((el) => {
        const node = <ElementSvg key={el.id} el={el} imageHref={imageHref} />;
        return renderElement ? renderElement(el, node) : node;
      })}
      {overlay}
    </svg>
  );
}

export function rotation(el: DesignElement): string | undefined {
  if (!el.rotation) return undefined;
  return `rotate(${el.rotation} ${el.x + el.w / 2} ${el.y + el.h / 2})`;
}

export function ElementSvg({
  el,
  imageHref,
}: {
  el: DesignElement;
  imageHref: ImageHref;
}) {
  const transform = rotation(el);
  switch (el.type) {
    case "rect":
      return (
        <rect
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          transform={transform}
          fill={el.fill ?? "none"}
          stroke={el.stroke ?? "none"}
          strokeWidth={el.stroke ? el.strokeWidth : 0}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={el.x + el.w / 2}
          cy={el.y + el.h / 2}
          rx={el.w / 2}
          ry={el.h / 2}
          transform={transform}
          fill={el.fill ?? "none"}
          stroke={el.stroke ?? "none"}
          strokeWidth={el.stroke ? el.strokeWidth : 0}
        />
      );
    case "line":
      return (
        <line
          x1={el.x}
          y1={el.y + el.h / 2}
          x2={el.x + el.w}
          y2={el.y + el.h / 2}
          transform={transform}
          stroke={el.stroke ?? el.fill ?? "#000000"}
          strokeWidth={Math.max(el.strokeWidth, 1)}
          strokeLinecap="round"
        />
      );
    case "text": {
      const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
      const x = el.align === "center" ? el.x + el.w / 2 : el.align === "right" ? el.x + el.w : el.x;
      const lines = el.text.split("\n");
      return (
        <text
          x={x}
          y={el.y + el.fontSize * 0.9}
          transform={transform}
          fontFamily={el.fontFamily}
          fontSize={el.fontSize}
          fontWeight={el.fontWeight}
          fill={el.color}
          textAnchor={anchor}
          style={{ whiteSpace: "pre" }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={x} dy={i === 0 ? 0 : el.fontSize * 1.2}>
              {line || " "}
            </tspan>
          ))}
        </text>
      );
    }
    case "image":
      return <ImageSvg el={el} href={imageHref(el)} transform={transform} />;
  }
}

function ImageSvg({
  el,
  href,
  transform,
}: {
  el: Extract<DesignElement, { type: "image" }>;
  href: string | null;
  transform?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (!href) return;
    const probe = new Image();
    probe.onerror = () => setFailed(href);
    probe.src = href;
    return () => {
      probe.onerror = null;
    };
  }, [href]);
  if (!href || failed === href)
    return (
      <g transform={transform} data-testid="missing-image">
        <rect
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          className="fill-muted stroke-muted-foreground"
          strokeWidth={Math.max(2, el.w / 100)}
          strokeDasharray="12 8"
        />
        <path
          d={`M${el.x} ${el.y}L${el.x + el.w} ${el.y + el.h}M${el.x + el.w} ${el.y}L${el.x} ${el.y + el.h}`}
          className="stroke-muted-foreground"
          strokeWidth={Math.max(1, el.w / 200)}
        />
      </g>
    );
  return (
    <image
      href={href}
      x={el.x}
      y={el.y}
      width={el.w}
      height={el.h}
      transform={transform}
      preserveAspectRatio="xMidYMid meet"
      onError={() => setFailed(href)}
    />
  );
}

/** Where an image element's file is served, given what grants access to it. */
export function imageHrefFor(via: { design?: string; template?: string }): ImageHref {
  return (el) => {
    if (el.source === "logo") return `/files/logo/${el.assetId}`;
    const query = via.design
      ? `?design=${encodeURIComponent(via.design)}`
      : via.template
        ? `?template=${encodeURIComponent(via.template)}`
        : "";
    return `/files/u/${el.assetId}${query}`;
  };
}

/** A small preview of a page, scaled to its box. */
export function Thumbnail({
  page,
  width,
  height,
  imageHref,
}: {
  page: DesignPage | undefined;
  width: number;
  height: number;
  imageHref: ImageHref;
}) {
  return (
    <div
      data-testid="thumbnail"
      className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-muted p-3"
    >
      {page ? (
        <PageSvg
          page={page}
          width={width}
          height={height}
          imageHref={imageHref}
          className="max-h-full max-w-full shadow-sm"
          style={{ aspectRatio: `${width} / ${height}` }}
        />
      ) : null}
    </div>
  );
}
