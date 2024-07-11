import Avatar from "./Avatar.jsx";

export default function Contact({ id, username, onClick, selected, online }) {
  return (
    <div
      key={id}
      onClick={() => onClick(id)}
      className={
        " flex items-center gap-2 cursor-pointer " +
        (selected ? "bg-[#a30e46]" : "")
      }
    >
      {selected && <div className="w-1 bg-[#2e1e3f] h-12 rounded-r-md"></div>}
      <div className="flex gap-2 py-2 pl-4 items-center">
        <Avatar online={online} username={username} userId={id} />
        <span className="text-white">{username}</span>
      </div>
    </div>
  );
}
