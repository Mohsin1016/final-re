import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import Contact from "./Contact";
import Logo from "./Logo";
import ParticlesBackground from "./ParticlesBackground.jsx";
import { AiOutlinePicture } from "react-icons/ai";
import { CiUser } from "react-icons/ci";
import { FaFile } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";
import "../style.css";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const { username, id, setId, setUserName } = useContext(UserContext);
  const divUnderMessages = useRef();

  useEffect(() => {
    connectToWs();
  }, [selectedUserId]);

  function connectToWs() {
    const ws = new WebSocket("wss://final-api-1.onrender.com");
    setWs(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected. Trying to reconnect.");
        connectToWs();
      }, 1000);
    });
  }

  function showOnlinePeople(peopleArray) {
    const people = {};
    peopleArray.forEach(({ userId, username }) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    console.log("Received message data:", messageData);

    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if (messageData.text || messageData.file) {
      console.log("Handling message:", messageData);
      if (
        messageData.sender === selectedUserId ||
        messageData.recipient === id
      ) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  }

  function logout() {
    axios.post("/logout").then(() => {
      setWs(null);
      setId(null);
      setUserName(null);
    });
  }

  function sendMessage(ev, file = null, blob = false) {
    if (ev) ev.preventDefault();
    const message = {
      recipient: selectedUserId,
      text: newMessageText,
      file,
    };
    try {
      ws.send(JSON.stringify(message));
      if (file) {
        setMessages((prev) => [
          ...prev,
          {
            text: newMessageText,
            sender: id,
            recipient: selectedUserId,
            file: URL.createObjectURL(blob), // Temporarily show the file URL
            _id: Date.now(),
          },
        ]);
      } else {
        setNewMessageText("");
        setMessages((prev) => [
          ...prev,
          {
            text: newMessageText,
            sender: id,
            recipient: selectedUserId,
            _id: Date.now(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  // function sendFile(ev) {
  //   const reader = new FileReader();
  //   reader.readAsDataURL(ev.target.files[0]);
  //   reader.onload = () => {
  //     sendMessage(null, {
  //       name: ev.target.files[0].name,
  //       data: reader.result,
  //     });
  //   };
  // }
  function convertBase64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  function sendFile(ev) {
    const file = ev.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        const blob = convertBase64ToBlob(base64, file.type);
        sendMessage(
          null,
          {
            name: ev.target.files[0].name,
            data: reader.result,
          },
          blob
        );
      };
      reader.readAsDataURL(file);
    }
  }

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    axios.get("/people").then((res) => {
      const offlinePeopleArr = res.data
        .filter((p) => p._id !== id)
        .filter((p) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople = {};
      offlinePeopleArr.forEach((p) => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  useEffect(() => {
    if (selectedUserId) {
      axios.get("/messages/" + selectedUserId).then((res) => {
        setMessages(res.data);
      });
    }
  }, [selectedUserId]);

  const onlinePeopleExclOurUser = { ...onlinePeople };
  delete onlinePeopleExclOurUser[id];

  const messagesWithoutDupes = uniqBy(messages, "_id");

  return (
    <>
      <ParticlesBackground />
      <div className="flex h-screen ">
        <div className="w-1/3 flex flex-col user-field">
          <div className="flex-grow ">
            <Logo />
            {Object.keys(onlinePeopleExclOurUser).map((userId) => (
              <Contact
                key={userId}
                id={userId}
                online={true}
                username={onlinePeopleExclOurUser[userId]}
                onClick={() => {
                  setSelectedUserId(userId);
                  console.log({ userId });
                }}
                selected={userId === selectedUserId}
              />
            ))}
            {Object.keys(offlinePeople).map((userId) => (
              <Contact
                key={userId}
                id={userId}
                online={false}
                username={offlinePeople[userId].username}
                onClick={() => setSelectedUserId(userId)}
                selected={userId === selectedUserId}
              />
            ))}
          </div>
          <div className="p-2 text-center flex items-center justify-center">
            <span className="mr-2 text-sm text-white flex items-center">
              <CiUser className="w-6 h-6" />
              {username}
            </span>
            <button
              onClick={logout}
              className="text-sm bg-blue-100 py-1 px-2 text-gray-600 border rounded-sm"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="flex flex-col w-2/3 p-2 chat-field">
          <div className="flex-grow">
            {!selectedUserId && (
              <div className="flex h-full items-center justify-center">
                <div className="text-gray-400">
                  &larr; Select a person from the sidebar
                </div>
              </div>
            )}
            {!!selectedUserId && (
              <div className="relative h-full">
                <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                  {messagesWithoutDupes.map((message) => (
                    <div
                      key={message._id}
                      className={
                        message.sender === id ? "text-right" : "text-left"
                      }
                    >
                      <div
                        className={
                          "text-left inline-block p-2 my-2 rounded-md text-sm " +
                          (message.sender === id
                            ? "bg-[#241a36] text-white"
                            : "bg-[#34234a] text-white")
                        }
                      >
                        {message.text}
                        {message.file && (
                          <div>
                            <a
                              target="_blank"
                              className="border-b flex items-center gap-1"
                              href={message.file}
                            >
                              <FaFile className="w-4 h-4" />{" "}
                              {/* Replace the SVG with FaFile */}
                              {message.file}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={divUnderMessages}></div>
                </div>
              </div>
            )}
          </div>
          {!!selectedUserId && (
            <form
              className="flex flex-col md:flex-row gap-2"
              onSubmit={sendMessage}
            >
              <input
                type="text"
                value={newMessageText}
                onChange={(ev) => setNewMessageText(ev.target.value)}
                placeholder="Type your message here"
                className="bg-[#291f3d] border border-[#34234a] p-2 flex-grow rounded-sm text-white"
              />
              <div className="flex items-center gap-2">
                <label className="bg-gray-200 p-2 text-gray-600 rounded-sm border border-gray-300 cursor-pointer flex items-center">
                  <input type="file" className="hidden" onChange={sendFile} />
                  <AiOutlinePicture />
                </label>
                <button
                  type="submit"
                  className="bg-blue-500 p-2 text-white rounded-sm"
                >
                  <IoIosSend />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
