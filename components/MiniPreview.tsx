import { DEVICES, IMAGE_TYPES, Project } from "@/lib/types";
import { OBJECT_FIT, elementBackground } from "@/lib/render";

export default function MiniPreview({ project }: { project: Project }) {
  const ratio = DEVICES[project.device].ratio;
  return (
    <div className="mini-wrap">
      <div className="mini" style={{ aspectRatio: String(ratio) }}>
        {project.elements.map((el) => (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: `${el.x * 100}%`,
              top: `${el.y * 100}%`,
              width: `${el.w * 100}%`,
              height: `${el.h * 100}%`,
              background: elementBackground(el),
              borderRadius: el.radius / 4,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              overflow: "hidden",
            }}
          >
            {IMAGE_TYPES.includes(el.type) && el.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={el.image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: OBJECT_FIT[el.scaleType], display: "block" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
