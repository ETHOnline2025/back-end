'use client';

import { motion, type MotionProps } from 'motion/react';
import { ReactNode, useMemo } from 'react';

type View = 'idle' | 'ring' | 'timer' | 'notification';

export interface DynamicIslandProps {
  view?: View;
  className?: string;
  idleContent?: ReactNode;
  ringContent?: ReactNode;
  timerContent?: ReactNode;
  notificationContent?: ReactNode;
}

const MOTION_TRANSITION = {
  type: 'spring',
  bounce: 0.35,
} as const satisfies MotionProps['transition'];

export default function DynamicIsland({
  view = 'idle',
  className = '',
  idleContent,
  ringContent,
  timerContent,
  notificationContent,
}: DynamicIslandProps) {
  const content = useMemo(() => {
    switch (view) {
      case 'ring':
        return ringContent ?? idleContent ?? null;
      case 'timer':
        return timerContent ?? idleContent ?? null;
      case 'notification':
        return notificationContent ?? idleContent ?? null;
      default:
        return idleContent ?? null;
    }
  }, [view, idleContent, ringContent, timerContent, notificationContent]);

  return (
    <div className={`h-[200px] ${className} `}>
      <div className="flex h-full w-full flex-col justify-center">
        <motion.div
          layout
          transition={MOTION_TRANSITION}
          style={{ borderRadius: 32 }}
          className="mx-auto w-fit min-w-[100px] overflow-hidden rounded-full bg-black"
        >
          <motion.div
            key={view}
            layout
            initial={{ scale: 0.95, opacity: 1, filter: 'blur(8px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={MOTION_TRANSITION}
          >
            {content}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
