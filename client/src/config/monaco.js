import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure Monaco editor to use the locally bundled monaco instance, eliminating external CDN dependencies
loader.config({ monaco });

export default monaco;

