
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app'
import RestApiClient from '@/RestApiClient'

// Mock RestApiClient
vi.mock('@/RestApiClient', () => ({
  default: {
    getSystemConfig: vi.fn(),
    getRegisteredCeleryTasks: vi.fn(),
    getWorkflowTemplates: vi.fn(),
    getAllGroups: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = (function () {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('App Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('setSystemConfig', () => {
    it('sets systemConfig and activeLLM from localStorage if available', async () => {
      const mockConfig = {
        active_llms: [
          { name: 'Gemini', id: 'gemini' },
          { name: 'GPT-4', id: 'gpt4' },
        ],
      }
      RestApiClient.getSystemConfig.mockResolvedValue(mockConfig)
      localStorage.setItem('llm', 'GPT-4')

      await store.setSystemConfig()

      expect(store.systemConfig).toEqual(mockConfig)
      expect(store.activeLLM).toEqual({ name: 'GPT-4', id: 'gpt4' })
    })

    it('sets systemConfig and activeLLM from config if localStorage is empty', async () => {
      const mockConfig = {
        active_llms: [
          { name: 'Gemini', id: 'gemini' },
          { name: 'GPT-4', id: 'gpt4' },
        ],
      }
      RestApiClient.getSystemConfig.mockResolvedValue(mockConfig)

      await store.setSystemConfig()

      expect(store.systemConfig).toEqual(mockConfig)
      expect(store.activeLLM).toEqual({ name: 'Gemini', id: 'gemini' })
    })

    it('sets systemConfig and handles no active LLMs gracefully', async () => {
      const mockConfig = { active_llms: [] }
      RestApiClient.getSystemConfig.mockResolvedValue(mockConfig)

      await store.setSystemConfig()

      expect(store.systemConfig).toEqual(mockConfig)
      expect(store.activeLLM).toBeUndefined()
    })
  })

  describe('setRegisteredCeleryTasks', () => {
    it('fetches and sets registeredCeleryTasks if empty', async () => {
      const mockTasks = ['task1', 'task2']
      RestApiClient.getRegisteredCeleryTasks.mockResolvedValue(mockTasks)

      await store.setRegisteredCeleryTasks()

      expect(RestApiClient.getRegisteredCeleryTasks).toHaveBeenCalledTimes(1)
      expect(store.registeredCeleryTasks).toEqual(mockTasks)
    })

    it('does not fetch registeredCeleryTasks if already populated', async () => {
      store.registeredCeleryTasks = ['existing_task']
      
      await store.setRegisteredCeleryTasks()

      expect(RestApiClient.getRegisteredCeleryTasks).not.toHaveBeenCalled()
      expect(store.registeredCeleryTasks).toEqual(['existing_task'])
    })
  })

  describe('setActiveLLM', () => {
    it('updates activeLLM state and localStorage', async () => {
      const newLLM = { name: 'NewModel', id: 'new' }
      
      await store.setActiveLLM(newLLM)

      expect(store.activeLLM).toEqual(newLLM)
      expect(localStorage.getItem('llm')).toBe('NewModel')
    })
  })

  describe('setWorkflowTemplates', () => {
    it('fetches and sets workflowTemplates', async () => {
      const mockTemplates = [{ name: 'Template 1' }]
      RestApiClient.getWorkflowTemplates.mockResolvedValue(mockTemplates)

      await store.setWorkflowTemplates()

      expect(RestApiClient.getWorkflowTemplates).toHaveBeenCalledTimes(1)
      expect(store.workflowTemplates).toEqual(mockTemplates)
    })
  })

  describe('setGroups', () => {
    it('fetches and sets groups', async () => {
      const mockGroups = [{ name: 'Group 1' }]
      RestApiClient.getAllGroups.mockResolvedValue(mockGroups)

      await store.setGroups()

      expect(RestApiClient.getAllGroups).toHaveBeenCalledTimes(1)
      expect(store.groups).toEqual(mockGroups)
    })
  })
})
