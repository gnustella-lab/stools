import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  isDisabled?: boolean;
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied!',
  isDisabled = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  return (
    <Button
      label={copied ? copiedLabel : label}
      variant="secondary"
      size="sm"
      icon={<Icon icon={copied ? 'checkDouble' : 'copy'} size="sm" />}
      onClick={copy}
      isDisabled={isDisabled || value.length === 0}
    />
  );
}
