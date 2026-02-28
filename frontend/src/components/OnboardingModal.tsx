import { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Users, Trophy, Layout, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useHelp } from '../context/HelpContext';

const steps = [
    {
        title: 'Welcome to TaskMan',
        description: 'The ultimate tool to organize your work and collaborate with your team.',
        icon: <Layout className="w-12 h-12 text-indigo-500" />,
    },
    {
        title: 'Collaborate',
        description: 'Create projects, invite team members, and work together in real-time.',
        icon: <Users className="w-12 h-12 text-blue-500" />,
    },
    {
        title: 'Manage Tasks',
        description: 'Track progress with Kanban boards, lists, and calendar views.',
        icon: <Check className="w-12 h-12 text-green-500" />,
    },
    {
        title: 'Gamify Your Work',
        description: 'Earn achievements and track your productivity stats.',
        icon: <Trophy className="w-12 h-12 text-yellow-500" />,
    },
    {
        title: 'Get Started',
        description: 'Ready to boost your productivity? Let\'s go!',
        icon: <ArrowRight className="w-12 h-12 text-purple-500" />,
    },
];

export default function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const { user } = useAuthStore();
    const { completeOnboarding } = useHelp();

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (user && !hasSeenOnboarding) {
            // Wrap in setTimeout to avoid "setState synchronously within an effect" warning
            const timer = setTimeout(() => setIsOpen(true), 0);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        completeOnboarding();
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-8 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full">
                                {steps[currentStep].icon}
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {steps[currentStep].title}
                        </h2>

                        <p className="text-gray-600 dark:text-gray-300 mb-8">
                            {steps[currentStep].description}
                        </p>

                        <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                                {steps.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`h-2 w-2 rounded-full transition-colors ${index === currentStep
                                            ? 'bg-indigo-600 dark:bg-indigo-400'
                                            : 'bg-gray-200 dark:bg-gray-600'
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    {currentStep === steps.length - 1 ? 'Start' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
