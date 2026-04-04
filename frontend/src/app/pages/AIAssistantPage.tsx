// import { useState } from "react";
// import { Link } from "react-router";
// import { 
//   Sparkles, 
//   Send, 
//   Lightbulb, 
//   Bug, 
//   Zap, 
//   MessageSquare,
//   ArrowLeft,
//   Code,
//   FileCode,
//   History,
//   Loader2,
// } from "lucide-react";
// import { Button } from "../components/ui/button";
// import { Input } from "../components/ui/input";
// import { Card } from "../components/ui/card";
// import { ScrollArea } from "../components/ui/scroll-area";
// import { Avatar, AvatarFallback } from "../components/ui/avatar";
// import { chatWithAI } from "../../lib/ai";

// interface Message {
//   id: string;
//   type: 'user' | 'ai';
//   content: string;
//   timestamp: Date;
// }

// interface Conversation {
//   id: string;
//   title: string;
//   lastMessage: string;
//   timestamp: Date;
// }

// export default function AIAssistantPage() {
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: '1',
//       type: 'ai',
//       content: "Hello! I'm your AI coding assistant. I can help you with code explanations, debugging, optimizations, and much more. What would you like to work on today?",
//       timestamp: new Date(),
//     },
//   ]);
//   const [input, setInput] = useState("");
//   const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const quickPrompts = [
//     { 
//       icon: Lightbulb, 
//       text: "Explain this code", 
//       description: "Get detailed explanations of code snippets",
//       color: "text-yellow-400",
//       bg: "bg-yellow-400/10",
//       border: "border-yellow-400/30"
//     },
//     { 
//       icon: Bug, 
//       text: "Debug an error", 
//       description: "Find and fix bugs in your code",
//       color: "text-red-400",
//       bg: "bg-red-400/10",
//       border: "border-red-400/30"
//     },
//     { 
//       icon: Zap, 
//       text: "Optimize code", 
//       description: "Improve performance and efficiency",
//       color: "text-blue-400",
//       bg: "bg-blue-400/10",
//       border: "border-blue-400/30"
//     },
//     { 
//       icon: Code, 
//       text: "Generate code", 
//       description: "Create new functions and components",
//       color: "text-green-400",
//       bg: "bg-green-400/10",
//       border: "border-green-400/30"
//     },
//     { 
//       icon: FileCode, 
//       text: "Add documentation", 
//       description: "Generate comments and documentation",
//       color: "text-purple-400",
//       bg: "bg-purple-400/10",
//       border: "border-purple-400/30"
//     },
//     { 
//       icon: MessageSquare, 
//       text: "Best practices", 
//       description: "Learn coding standards and patterns",
//       color: "text-pink-400",
//       bg: "bg-pink-400/10",
//       border: "border-pink-400/30"
//     },
//   ];

//   const handleSend = async () => {
//     if (!input.trim()) return;
//     if (loading) return;

//     setError("");

//     const userMessage: Message = {
//       id: Date.now().toString(),
//       type: 'user',
//       content: input,
//       timestamp: new Date(),
//     };

//     const nextMessages = [...messages, userMessage];
//     setMessages(nextMessages);
//     setInput("");
//     setLoading(true);

//     try {
//       const reply = await chatWithAI(
//         nextMessages.map((message) => ({
//           role: message.type === "user" ? "user" as const : "assistant" as const,
//           content: message.content,
//         })),
//         { temperature: 0.3 }
//       );

//       const aiMessage: Message = {
//         id: (Date.now() + 1).toString(),
//         type: 'ai',
//         content: reply,
//         timestamp: new Date(),
//       };

//       setMessages(prev => [...prev, aiMessage]);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to get AI response");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleQuickPrompt = (prompt: string) => {
//     setInput(prompt);
//   };

//   return (
//     <div className="h-screen bg-[#1e1e1e] flex overflow-hidden">
//       {/* Main Chat Area */}
//       <div className="flex-1 flex flex-col">
//         {/* Header */}
//         <div className="h-16 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-6">
//           <div className="flex items-center gap-3">
//             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
//               <Sparkles className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <h1 className="text-xl font-bold text-white">AI Assistant</h1>
//               <p className="text-sm text-gray-400">Your intelligent coding companion</p>
//             </div>
//           </div>
//         </div>

//         {/* Quick Prompts (shown when no messages) */}
//         {messages.length <= 1 && (
//           <div className="p-8">
//             <div className="max-w-4xl mx-auto">
//               <div className="text-center mb-12">
//                 <h2 className="text-3xl font-bold text-white mb-3">
//                   How can I help you code today?
//                 </h2>
//                 <p className="text-gray-400">
//                   Choose a quick action below or ask me anything
//                 </p>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 {quickPrompts.map((prompt, index) => {
//                   const Icon = prompt.icon;
//                   return (
//                     <Card
//                       key={index}
//                       onClick={() => handleQuickPrompt(prompt.text)}
//                       className={`${prompt.bg} border ${prompt.border} p-5 hover:scale-105 transition-transform cursor-pointer`}
//                     >
//                       <Icon className={`w-8 h-8 ${prompt.color} mb-3`} />
//                       <h3 className="font-semibold text-white mb-1">{prompt.text}</h3>
//                       <p className="text-sm text-gray-400">{prompt.description}</p>
//                     </Card>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Messages */}
//         {messages.length > 1 && (
//           <ScrollArea className="flex-1 p-6">
//             <div className="max-w-4xl mx-auto space-y-6">
//               {messages.map((message) => (
//                 <div
//                   key={message.id}
//                   className={`flex gap-4 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
//                 >
//                   <Avatar className="w-10 h-10 flex-shrink-0">
//                     {message.type === 'ai' ? (
//                       <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
//                         AI
//                       </AvatarFallback>
//                     ) : (
//                       <AvatarFallback className="bg-gray-600 text-white">
//                         JD
//                       </AvatarFallback>
//                     )}
//                   </Avatar>
//                   <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
//                     <div
//                       className={`inline-block max-w-3xl p-4 rounded-lg text-sm ${
//                         message.type === 'user'
//                           ? 'bg-indigo-600 text-white'
//                           : 'bg-[#252526] text-gray-200 border border-[#3e3e42]'
//                       }`}
//                     >
//                       <div className="whitespace-pre-wrap">{message.content}</div>
//                     </div>
//                     <p className="text-xs text-gray-500 mt-2">
//                       {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                     </p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </ScrollArea>
//         )}

//         {/* Input */}
//         <div className="p-6 border-t border-[#3e3e42] bg-[#252526]">
//           <div className="max-w-4xl mx-auto">
//             {error && (
//               <p className="text-sm text-red-400 mb-3 text-center">{error}</p>
//             )}
//             <div className="flex gap-3">
//               <Input
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === 'Enter') {
//                     void handleSend();
//                   }
//                 }}
//                 placeholder="Ask me anything about coding..."
//                 className="bg-[#1e1e1e] border-[#3e3e42] text-white placeholder:text-gray-500 h-12"
//                 disabled={loading}
//               />
//               <Button
//                 onClick={() => void handleSend()}
//                 className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6"
//                 disabled={loading || !input.trim()}
//               >
//                 {loading ? (
//                   <>
//                     <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                     Thinking...
//                   </>
//                 ) : (
//                   <>
//                     <Send className="w-5 h-5 mr-2" />
//                     Send
//                   </>
//                 )}
//               </Button>
//             </div>
//             <p className="text-xs text-gray-500 mt-3 text-center">
//               AI can make mistakes. Always verify important information.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
