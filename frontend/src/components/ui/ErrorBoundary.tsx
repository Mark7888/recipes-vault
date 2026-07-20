import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
          <VStack gap={4} textAlign="center" maxW="400px">
            <Heading size="lg">Something went wrong</Heading>
            <Text color="fg.muted">
              An unexpected error occurred. Try reloading the page.
            </Text>
            <Button colorPalette="green" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </VStack>
        </Box>
      );
    }
    return this.props.children;
  }
}
