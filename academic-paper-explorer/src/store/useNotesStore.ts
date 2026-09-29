import { create } from 'zustand'
import { parseNotes, serializeNotes, withNote, type Notes } from '../lib/notes'

export const NOTES_STORAGE_KEY = 'connectedpapers.notes.v1'

function loadNotes(): Notes {
  try {
    return parseNotes(localStorage.getItem(NOTES_STORAGE_KEY))
  } catch {
    return {}
  }
}

function persist(notes: Notes): void {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, serializeNotes(notes))
  } catch {
    // storage unavailable (private mode / quota) — keep the in-memory copy only
  }
}

interface NotesState {
  notes: Notes
  setNote: (id: string, text: string) => void
  removeNote: (id: string) => void
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: loadNotes(),
  setNote: (id, text) => {
    const notes = withNote(get().notes, id, text)
    persist(notes)
    set({ notes })
  },
  removeNote: (id) => {
    const notes = withNote(get().notes, id, '')
    persist(notes)
    set({ notes })
  },
}))
