import { cn } from '@/lib/utils';
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';

import type { ElementType, RefObject } from 'react';
import { useRef, useState } from 'react';

type FloatingDockItem = {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
    </>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        'mx-auto  h-16 items-end gap-4 rounded-2xl bg-white px-4 pb-3 flex ',
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 100, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 100, 40]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 60, 20]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 60, 20]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <DockAction
      item={{ title, icon, href, onClick }}
      mouseProps={{
        ref,
        width,
        height,
        widthIcon,
        heightIcon,
        hovered,
        setHovered,
      }}
    />
  );
}

function DockAction({
  item,
  mouseProps,
}: {
  item: FloatingDockItem;
  mouseProps?: {
    ref: RefObject<HTMLDivElement | null>;
    width: MotionValue<number>;
    height: MotionValue<number>;
    widthIcon: MotionValue<number>;
    heightIcon: MotionValue<number>;
    hovered: boolean;
    setHovered: (value: boolean) => void;
  };
}) {
  const { title, icon, href, onClick } = item;

  const Wrapper: ElementType = onClick ? 'button' : 'a';
  const wrapperProps = onClick
    ? {
        type: 'button' as const,
        onClick,
        className: 'block focus:outline-none',
      }
    : {
        href: href ?? '#',
        className: 'block focus:outline-none',
      };

  const content = (
    <motion.div
      ref={mouseProps?.ref}
      style={mouseProps ? { width: mouseProps.width, height: mouseProps.height } : undefined}
      onMouseEnter={() => mouseProps?.setHovered(true)}
      onMouseLeave={() => mouseProps?.setHovered(false)}
      className="relative flex aspect-square items-center justify-center rounded-full bg-white/20 text-neutral-800 shadow-sm transition dark:bg-white/15 dark:text-white"
    >
      <AnimatePresence>
        {mouseProps?.hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 2, x: '-50%' }}
            className="absolute -top-8 left-1/2 w-fit rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs whitespace-pre text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={
          mouseProps ? { width: mouseProps.widthIcon, height: mouseProps.heightIcon } : undefined
        }
        className="flex items-center justify-center"
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  return <Wrapper {...wrapperProps}>{content}</Wrapper>;
}
