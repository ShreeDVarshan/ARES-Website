import { create } from 'zustand'
import type { WSMessage } from '../types'

interface WSState {
  connected: boolean
  lastMessage: WSMessage | null
  setConnected: (v: boolean) => void
  setMessage: (m: WSMessage) => void
}

export const useWSStore = create<WSState>((set) => ({
  connected: false,
  lastMessage: null,
  setConnected: (connected) => set({ connected }),
  setMessage: (lastMessage) => set({ lastMessage }),
}))
