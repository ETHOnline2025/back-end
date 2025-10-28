import type { ComponentProps } from 'react';

export type ChainKey = 'ethereum' | 'arbitrum' | 'anvil' | 'solana' | 'base';

const chainStyles: Record<ChainKey, { initials: string; bg: string; text: string }> = {
  ethereum: {
    initials: 'ETH',
    bg: 'bg-gradient-to-br from-[#3c5eff] to-[#7a8cff]',
    text: 'text-white',
  },
  arbitrum: {
    initials: 'ARB',
    bg: 'bg-gradient-to-br from-[#00a8f0] to-[#005ac9]',
    text: 'text-white',
  },
  base: {
    initials: 'BASE',
    bg: 'bg-gradient-to-br from-[#0052ff] to-[#2684ff]',
    text: 'text-white',
  },
  anvil: {
    initials: 'ANV',
    bg: 'bg-gradient-to-br from-[#4b5563] to-[#111827]',
    text: 'text-white',
  },
  solana: {
    initials: 'SOL',
    bg: 'bg-gradient-to-br from-[#14f195] via-[#9945ff] to-[#19fb9b]',
    text: 'text-black',
  },
};

type ChainAvatarProps = {
  chain: ChainKey;
} & Pick<ComponentProps<'span'>, 'className'>;

export function ChainAvatar({ chain, className }: ChainAvatarProps) {
  const style = chainStyles[chain];

  return (
    <span
      className={`flex items-center justify-center rounded-full font-semibold uppercase tracking-wide ${style.bg} ${style.text} ${
        className ?? ''
      }`}
    >
      {style.initials}
    </span>
  );
}

export function getPrimarySymbol(chain: ChainKey) {
  return chain === 'solana' ? 'SOL' : 'ETH';
}
