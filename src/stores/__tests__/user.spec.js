
/*
Copyright 2025-2026 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
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
