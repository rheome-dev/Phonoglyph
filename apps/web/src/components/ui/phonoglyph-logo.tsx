import React from 'react';
import { cn } from '@/lib/utils';

interface PhonoglyphLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PhonoglyphLogo({ className, size = 'md' }: PhonoglyphLogoProps) {
  const sizeScale = {
    sm: 0.32,
    md: 0.42,
    lg: 0.52
  } as const satisfies Record<NonNullable<PhonoglyphLogoProps['size']>, number>;

  return (
    <div className="overflow-hidden w-full max-w-full" style={{ contain: 'layout' }}>
      <pre
        className={cn(
          "font-mono whitespace-pre text-gray-100 inline-block origin-top-left",
          className
        )}
        style={{
          fontSize: '10px',
          lineHeight: '10px',
          transform: `scale(${sizeScale[size] ?? sizeScale.md})`,
          transformOrigin: 'top left',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
{`                                                                                                                    
                                                                                                                    
\`7MM"""Mq.\`7MMF'  \`7MMF' .g8""8q. \`7MN.   \`7MF' .g8""8q.     .g8"""bgd \`7MMF'   \`YMM'   \`MM'\`7MM"""Mq.\`7MMF'  \`7MMF'
  MM   \`MM. MM      MM .dP'    \`YM. MMN.    M .dP'    \`YM. .dP'     \`M   MM       VMA   ,V    MM   \`MM. MM      MM  
  MM   ,M9  MM      MM dM'      \`MM M YMb   M dM'      \`MM dM'       \`   MM        VMA ,V     MM   ,M9  MM      MM  
  MMmmdM9   MMmmmmmmMM MM        MM M  \`MN. M MM        MM MM            MM         VMMP      MMmmdM9   MMmmmmmmMM  
  MM        MM      MM MM.      ,MP M   \`MM.M MM.      ,MP MM.    \`7MMF' MM      ,   MM       MM        MM      MM  
  MM        MM      MM \`Mb.    ,dP' M     YMM \`Mb.    ,dP' \`Mb.     MM   MM     ,M   MM       MM        MM      MM  
.JMML.    .JMML.  .JMML. \`"bmmd"' .JML.    YM   \`"bmmd"'     \`"bmmmdPY .JMMmmmmMMM .JMML.   .JMML.    .JMML.  .JMML.
                                                                                                                    
                                                                                                                    `}
      </pre>
    </div>
  );
}
