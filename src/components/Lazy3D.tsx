import { ComponentType, Suspense, useRef } from 'react';
import { useInView } from '../motion/hooks';

/**
 * Loads a 3D scene only when its chapter approaches (one viewport ahead),
 * and renders frames only while it is actually visible.
 */
export function Lazy3D<P extends object>({
  scene: Scene,
  props,
  className = 'fill',
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene: ComponentType<any>;
  props: P;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // mounted only near the viewport, so at most one WebGL context lives at a time
  const near = useInView(ref, { rootMargin: '100% 0px' });
  const active = useInView(ref, { rootMargin: '40px 0px' });
  return (
    <div ref={ref} className={className}>
      {near && (
        <Suspense fallback={null}>
          <Scene {...props} active={active} />
        </Suspense>
      )}
    </div>
  );
}
