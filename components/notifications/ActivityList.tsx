import { ActivityRow, type ActivityItem } from "./ActivityRow";

type Group = {
  label: string;
  items: ActivityItem[];
};

type Props = {
  groups: Group[];
};

export function ActivityList({ groups }: Props) {
  if (groups.every((g) => g.items.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="font-sans text-[14px] text-text-2">No activity yet.</p>
        <p className="mt-1 font-sans text-[13px] text-text-3">
          Activity from your household will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {groups
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <div key={group.label}>
            <p
              className="mb-2 pl-1 font-sans font-semibold uppercase text-text-3"
              style={{ fontSize: 10.5, letterSpacing: "0.14em" }}
            >
              {group.label}
            </p>
            <div className="flex flex-col gap-2">
              {group.items.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
