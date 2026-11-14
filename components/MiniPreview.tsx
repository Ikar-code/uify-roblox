import { DEVICES, Project } from "@/lib/types";

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
              background: el.color,
              borderRadius: el.radius / 4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
