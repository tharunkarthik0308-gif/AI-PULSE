import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  ShieldCheck,
  Clock,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { EmptyState } from '../components/common/EmptyState';

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.getChatRooms();
      if (res.success) {
        setRooms(res.rooms || []);
        if (res.rooms && res.rooms.length > 0 && !selectedRoom) {
          setSelectedRoom(res.rooms[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // When room is selected, fetch messages and join socket room
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchMessages = async () => {
      try {
        const res = await api.getRoomMessages(selectedRoom.id);
        if (res.success) {
          setMessages(res.messages || []);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        console.error('Error fetching room messages:', err);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit('join_chat_room', selectedRoom.id);

      const handleNewMessage = (newMsg: any) => {
        if (newMsg.chatRoomId === selectedRoom.id) {
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(scrollToBottom, 100);
        }
      };

      socket.on('new_message', handleNewMessage);

      return () => {
        socket.emit('leave_chat_room', selectedRoom.id);
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [selectedRoom, socket]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedRoom || !socket) return;

    socket.emit('send_message', {
      chatRoomId: selectedRoom.id,
      message: text.trim(),
    });

    setText('');
  };

  const isDoctor = user?.role === 'DOCTOR';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="bg-white border border-surface-200 rounded-2xl p-6 shadow-subtle">
        <span className="text-xs font-semibold uppercase tracking-wider text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded border border-clinical-200">
          Encrypted Communications
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 mt-1">
          Clinical Messages
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">
          Encrypted direct messaging between patients and authorized healthcare providers.
        </p>
      </div>

      {loading ? (
        <div className="h-80 bg-surface-100 rounded-2xl animate-pulse" />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-8 h-8" />}
          title="No clinical conversations yet"
          description="Direct messaging channels are automatically opened upon scheduling an appointment."
        />
      ) : (
        <div className="bg-white border border-surface-200 rounded-2xl shadow-subtle overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
          {/* Left Rooms List (4 cols) */}
          <div className="md:col-span-4 border-r border-surface-200 divide-y divide-surface-100">
            <div className="p-4 bg-surface-50/50">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
                Active Channels
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-surface-100">
              {rooms.map((room) => {
                const partnerName = isDoctor ? room.patient?.user?.name : room.doctor?.user?.name;
                const isSelected = selectedRoom?.id === room.id;
                const lastMsg = room.messages && room.messages[0];

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-4 cursor-pointer transition-colors text-left ${
                      isSelected ? 'bg-clinical-50/60 border-l-4 border-clinical-600' : 'hover:bg-surface-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-surface-900 truncate">
                        {partnerName}
                      </h4>
                      {lastMsg && (
                        <span className="text-[10px] text-surface-400">
                          {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 truncate mt-1">
                      {lastMsg ? lastMsg.message : 'Channel open. Send a message.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Messages Area (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between">
            {selectedRoom ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-surface-200 bg-surface-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-clinical-50 text-clinical-700 font-bold text-xs flex items-center justify-center border border-clinical-200">
                      {(isDoctor
                        ? selectedRoom.patient?.user?.name
                        : selectedRoom.doctor?.user?.name
                      )?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-surface-900">
                        {isDoctor
                          ? selectedRoom.patient?.user?.name
                          : selectedRoom.doctor?.user?.name}
                      </h3>
                      <span className="text-[10px] text-surface-400">
                        {isDoctor ? 'Patient Record' : 'Attending Physician'}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Active TLS</span>
                  </span>
                </div>

                {/* Messages Body */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                  {messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-surface-400">
                      No messages yet. Send a message to initiate discussion.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-md px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? 'bg-clinical-600 text-white rounded-br-xs'
                                : 'bg-surface-100 text-surface-900 rounded-bl-xs'
                            }`}
                          >
                            <p>{msg.message}</p>
                          </div>
                          <span className="text-[10px] text-surface-400 mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-surface-200 bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type clinical inquiry or message..."
                    className="flex-1 px-3.5 py-2 text-xs bg-surface-50 border border-surface-200 rounded-xl text-surface-900 focus:bg-white focus:border-clinical-500"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="p-2.5 bg-clinical-600 hover:bg-clinical-700 disabled:opacity-50 text-white rounded-xl shadow-subtle transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="py-24 text-center text-xs text-surface-400">
                Select a channel from the left panel.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
