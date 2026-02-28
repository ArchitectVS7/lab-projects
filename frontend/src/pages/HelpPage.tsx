import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { userGuide, type GuideChapter } from '../data/userGuide';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapterId, setActiveChapterId] = useState(userGuide[0]?.id ?? '');
  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveChapterId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    const obs = observerRef.current;
    for (const el of Object.values(chapterRefs.current)) {
      if (el) obs.observe(el);
    }

    return () => obs.disconnect();
  }, []);

  // Filter chapters/sections by search query
  const filteredGuide = useMemo(() => {
    if (!searchQuery.trim()) return userGuide;
    const q = searchQuery.toLowerCase();
    return userGuide
      .map((chapter) => {
        const chapterMatch =
          chapter.title.toLowerCase().includes(q) ||
          chapter.description.toLowerCase().includes(q);
        const matchingSections = chapter.sections.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.content.toLowerCase().includes(q)
        );
        if (chapterMatch) return chapter; // show full chapter
        if (matchingSections.length > 0)
          return { ...chapter, sections: matchingSections };
        return null;
      })
      .filter(Boolean) as GuideChapter[];
  }, [searchQuery]);

  const scrollToChapter = (id: string) => {
    chapterRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">User Guide</h1>
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search the guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-sm transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              {filteredGuide.length} {filteredGuide.length === 1 ? 'chapter' : 'chapters'}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-10">
          {/* TOC sidebar — hidden on small screens, horizontal pills instead */}
          <nav className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Chapters
              </p>
              {filteredGuide.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => scrollToChapter(chapter.id)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeChapterId === chapter.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-base">{chapter.icon}</span>
                  <span className="truncate">{chapter.title}</span>
                  {activeChapterId === chapter.id && (
                    <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Horizontal pill bar for small screens */}
          <div className="lg:hidden w-full overflow-x-auto pb-4 -mt-2 mb-4">
            <div className="flex gap-2 min-w-max">
              {filteredGuide.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => scrollToChapter(chapter.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    activeChapterId === chapter.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>{chapter.icon}</span>
                  <span>{chapter.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-16">
            {filteredGuide.length === 0 && (
              <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                <p className="text-lg">No results for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try a different search term.</p>
              </div>
            )}

            {filteredGuide.map((chapter) => (
              <section
                key={chapter.id}
                id={chapter.id}
                ref={(el) => { chapterRefs.current[chapter.id] = el; }}
              >
                {/* Chapter header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{chapter.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {chapter.title}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                      {chapter.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-10">
                  {chapter.sections.map((section) => {
                    const q = searchQuery.toLowerCase();
                    const sectionMatches = q && (
                      section.title.toLowerCase().includes(q) ||
                      section.content.toLowerCase().includes(q)
                    );
                    return (
                    <div key={section.id} id={section.id} className={sectionMatches ? 'border-l-2 border-indigo-400 dark:border-indigo-500 pl-4' : ''}>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                        {section.title}
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-3 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_strong]:dark:text-gray-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_code]:bg-gray-100 [&_code]:dark:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-indigo-600 [&_code]:dark:text-indigo-400 [&_code]:text-xs [&_a]:text-indigo-600 [&_a]:dark:text-indigo-400 [&_a]:underline">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Divider between chapters */}
                <hr className="mt-14 border-gray-200 dark:border-gray-700" />
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
