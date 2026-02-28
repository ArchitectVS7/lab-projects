
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { featureTutorials, FeatureTutorial } from '../data/featureTutorials';

export interface ContentBlock {
    blockId: string;
    title: string;
    content: string;
    level: number;
    sortOrder: number;
    metadata: {
        featureId?: string;
        route?: string;
        audience?: string[];
        surface?: string[];
        tags?: string[];
    };
}

interface HelpContextType {
    isOpen: boolean;
    toggleHelp: () => void;
    closeHelp: () => void;
    openHelp: () => void;
    blocks: ContentBlock[];
    isLoading: boolean;
    suggestedBlocks: ContentBlock[];
    searchBlocks: (query: string) => ContentBlock[];
    // Tutorial state
    activeTutorial: FeatureTutorial | null;
    tutorialStep: number;
    openTutorial: (featureId: string) => void;
    closeTutorial: () => void;
    nextTutorialStep: () => void;
    prevTutorialStep: () => void;
    seenFeatures: string[];
    markFeatureSeen: (id: string) => void;
    pendingDiscovery: FeatureTutorial | null;
    // Onboarding gate
    onboardingDone: boolean;
    completeOnboarding: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

const SEEN_FEATURES_KEY = 'tm_seenFeatures';

function loadSeenFeatures(): string[] {
    try {
        const raw = localStorage.getItem(SEEN_FEATURES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveSeenFeatures(ids: string[]) {
    try {
        localStorage.setItem(SEEN_FEATURES_KEY, JSON.stringify(ids));
    } catch {
        // ignore storage errors
    }
}

export function HelpProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [blocks, setBlocks] = useState<ContentBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTutorial, setActiveTutorial] = useState<FeatureTutorial | null>(null);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [seenFeatures, setSeenFeatures] = useState<string[]>(loadSeenFeatures);
    const [pendingDiscovery, setPendingDiscovery] = useState<FeatureTutorial | null>(null);
    const [onboardingDone, setOnboardingDone] = useState(() =>
        !!localStorage.getItem('hasSeenOnboarding')
    );
    const location = useLocation();

    // Load documentation on mount
    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const response = await fetch('/data/docs/database/content_blocks.json');
                if (response.ok) {
                    const data = await response.json();
                    setBlocks(data);
                } else {
                    console.error('Failed to load documentation:', response.statusText);
                }
            } catch (error) {
                console.error('Error loading documentation:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDocs();
    }, []);

    // Watch route changes for unseen features (only after onboarding is complete)
    useEffect(() => {
        if (!onboardingDone) {
            setPendingDiscovery(null);
            return;
        }
        const currentPath = location.pathname;
        const match = featureTutorials.find(t => {
            if (t.routePattern === '/') return currentPath === '/';
            return currentPath === t.routePattern || currentPath.startsWith(t.routePattern + '/');
        });

        if (match && !seenFeatures.includes(match.featureId)) {
            setPendingDiscovery(match);
        } else {
            setPendingDiscovery(null);
        }
    }, [location.pathname, seenFeatures, onboardingDone]);

    const toggleHelp = () => setIsOpen(prev => !prev);
    const closeHelp = () => setIsOpen(false);
    const openHelp = () => setIsOpen(true);

    const markFeatureSeen = useCallback((id: string) => {
        setSeenFeatures(prev => {
            if (prev.includes(id)) return prev;
            const next = [...prev, id];
            saveSeenFeatures(next);
            return next;
        });
        setPendingDiscovery(prev => (prev?.featureId === id ? null : prev));
    }, []);

    const openTutorial = useCallback((featureId: string) => {
        const tutorial = featureTutorials.find(t => t.featureId === featureId);
        if (tutorial) {
            setActiveTutorial(tutorial);
            setTutorialStep(0);
        }
    }, []);

    const closeTutorial = useCallback(() => {
        setActiveTutorial(null);
        setTutorialStep(0);
    }, []);

    const nextTutorialStep = useCallback(() => {
        setTutorialStep(prev => {
            if (activeTutorial && prev < activeTutorial.steps.length - 1) {
                return prev + 1;
            }
            return prev;
        });
    }, [activeTutorial]);

    const prevTutorialStep = useCallback(() => {
        setTutorialStep(prev => Math.max(0, prev - 1));
    }, []);

    const completeOnboarding = useCallback(() => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        setOnboardingDone(true);
    }, []);

    // Find suggested blocks based on current route
    const suggestedBlocks = React.useMemo(() => {
        if (!blocks.length) return [];

        const currentPath = location.pathname;

        return blocks.filter(block => {
            if (!block.metadata?.route) return false;
            return currentPath === block.metadata.route ||
                (block.metadata.route !== '/' && currentPath.startsWith(block.metadata.route));
        }).sort((a, b) => (b.metadata.route?.length || 0) - (a.metadata.route?.length || 0));
    }, [blocks, location.pathname]);

    const searchBlocks = (query: string) => {
        if (!query.trim()) return [];
        const lowerQuery = query.toLowerCase();
        return blocks.filter(block =>
            block.title.toLowerCase().includes(lowerQuery) ||
            block.content.toLowerCase().includes(lowerQuery)
        ).slice(0, 10);
    };

    return (
        <HelpContext.Provider value={{
            isOpen,
            toggleHelp,
            closeHelp,
            openHelp,
            blocks,
            isLoading,
            suggestedBlocks,
            searchBlocks,
            activeTutorial,
            tutorialStep,
            openTutorial,
            closeTutorial,
            nextTutorialStep,
            prevTutorialStep,
            seenFeatures,
            markFeatureSeen,
            pendingDiscovery,
            onboardingDone,
            completeOnboarding,
        }}>
            {children}
        </HelpContext.Provider>
    );
}

export function useHelp() {
    const context = useContext(HelpContext);
    if (context === undefined) {
        throw new Error('useHelp must be used within a HelpProvider');
    }
    return context;
}
