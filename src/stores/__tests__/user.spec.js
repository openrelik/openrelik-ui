
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../user'
import RestApiClient from '@/RestApiClient'

// Mock RestApiClient
vi.mock('@/RestApiClient', () => ({
  default: {
    getUser: vi.fn(),
  },
}))

describe('User Store', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUserStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('setUser', () => {
    it('fetches and sets the user', async () => {
      const mockUser = {
        name: 'Test User',
        email: 'test@example.com',
      }
      RestApiClient.getUser.mockResolvedValue(mockUser)

      await store.setUser()

      expect(RestApiClient.getUser).toHaveBeenCalledTimes(1)
      expect(store.user).toEqual(mockUser)
    })
  })
})
