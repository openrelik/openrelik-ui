
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInvestigationStore } from '../investigation';
import RestApiClient from '@/RestApiClient';

// Mock RestApiClient
vi.mock('@/RestApiClient', () => ({
    default: {
        createAgentSession: vi.fn(),
        sse: vi.fn(),
    },
}));

describe('Investigation Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('createSession should set sessionId', async () => {
        const store = useInvestigationStore();
        RestApiClient.createAgentSession.mockResolvedValue({ session_id: 'sess-123' });
        
        await store.createSession('folder-1');
        
        expect(store.sessionId).toBe('sess-123');
        expect(RestApiClient.createAgentSession).toHaveBeenCalledWith('folder-1');
    });

    it('getSessionData should subscribe to SSE and update sessionData', () => {
        const store = useInvestigationStore();
        store.sessionId = 'sess-123';
        const folderId = 'folder-1';
        
        const mockSubscribe = vi.fn();
        RestApiClient.sse.mockReturnValue({ subscribe: mockSubscribe });

        store.getSessionData(folderId);

        expect(RestApiClient.sse).toHaveBeenCalledWith(
            `folders/${folderId}/investigations/${store.sessionId}`
        );
        expect(mockSubscribe).toHaveBeenCalled();
        
        // Simulate data update
        const subscribeCalls = mockSubscribe.mock.calls[0];
        const observer = subscribeCalls[0];
        
        const mockData = { status: 'running', result: 'foo' };
        observer.next(JSON.stringify(mockData));
        
        expect(store.sessionData).toEqual(mockData);
    });

    it('runAgent should trigger getSessionData', async () => {
        const store = useInvestigationStore();
        store.sessionId = 'sess-123';
        const folderId = 'folder-1';
        
        // Spy on getSessionData
        const getSessionDataSpy = vi.spyOn(store, 'getSessionData');
        
        // Mock SSE for runAgent
        RestApiClient.sse.mockReturnValue({ subscribe: vi.fn() });
        
        await store.runAgent(folderId);
        
        expect(getSessionDataSpy).toHaveBeenCalledWith(folderId);
    });
});
