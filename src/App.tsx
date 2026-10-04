import { useEffect, useState } from 'react';
import { audio } from './audio/engine';
import { ChapterIndicator } from './components/ChapterIndicator';
import { CursorSystem } from './components/CursorSystem';
import { SoundToggle } from './components/SoundToggle';
import { ENV, Env } from './motion/environments';
import { installPointer } from './motion/pointer';
import { Attention } from './sections/Attention';
import { Coda } from './sections/Coda';
import { Opening } from './sections/Opening';
import { Rhythm } from './sections/Rhythm';
import { Timing } from './sections/Timing';
import { Weight } from './sections/Weight';

export default function App() {
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    installPointer();
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const env = el.dataset.env as Env;
          root.dataset.env = env;
          meta?.setAttribute('content', ENV[env].bg);
          setChapter(Number(el.dataset.chapter));
          // every chapter starts from silence; its own systems bring sound back
          audio.air(0);
        });
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    document.querySelectorAll('[data-env]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <main>
        <Opening />
        <Attention />
        <Timing />
        <Weight />
        <Rhythm />
        <Coda />
      </main>
      <ChapterIndicator current={chapter} />
      <SoundToggle />
      <CursorSystem />
      <div className="grain" aria-hidden />
    </>
  );
}
