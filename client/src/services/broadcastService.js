class BroadcastService {
  constructor() {
    this.channel = new BroadcastChannel('queen-of-spades-game');
    this.listeners = new Map();
    
    this.channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (this.listeners.has(type)) {
        this.listeners.get(type).forEach(callback => callback(data));
      }
    };
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => this.unsubscribe(eventType, callback);
  }

  unsubscribe(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }

  broadcast(eventType, data) {
    this.channel.postMessage({ type: eventType, data });
  }
}

const broadcastService = new BroadcastService();
export default broadcastService; 