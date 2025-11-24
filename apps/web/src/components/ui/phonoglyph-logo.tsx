import React from 'react';
import { cn } from '@/lib/utils';

interface PhonoglyphLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PhonoglyphLogo({ className, size = 'md' }: PhonoglyphLogoProps) {
  const sizeScale = {
    sm: 0.67,
    md: 1,
    lg: 1.33
  } as const satisfies Record<NonNullable<PhonoglyphLogoProps['size']>, number>;

  const scale = sizeScale[size] ?? sizeScale.md;
  const baseFontSize = 3;
  const scaledFontSize = baseFontSize * scale;
  const scaledLineHeight = baseFontSize * scale;
  
  return (
    <div className="overflow-hidden w-full" style={{ maxWidth: '100%' }}>
      <pre
        className={cn(
          "font-mono whitespace-pre text-gray-100 block",
          className
        )}
        style={{
          fontSize: `${scaledFontSize}px`,
          lineHeight: `${scaledLineHeight}px`,
          margin: 0,
          padding: 0
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
