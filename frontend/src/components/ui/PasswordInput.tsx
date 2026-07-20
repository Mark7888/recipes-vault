import { useState } from 'react';
import { IconButton, Input, InputGroup, type InputProps } from '@chakra-ui/react';
import { EyeIcon, EyeOffIcon } from './icons';

export function PasswordInput(props: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup
      endElement={
        <IconButton
          aria-label={visible ? 'Hide password' : 'Show password'}
          size="xs"
          variant="ghost"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </IconButton>
      }
    >
      <Input type={visible ? 'text' : 'password'} {...props} />
    </InputGroup>
  );
}
