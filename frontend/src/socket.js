import { io } from 'socket.io-client';

// 'autoConnect: false' ensures we wait until we actually want to connect (e.g., after login)
const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
  autoConnect: false,
});

export default socket;
