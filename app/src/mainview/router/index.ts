// =============================================================================
// ROUTER
// =============================================================================

export {
  ROUTES,
  chatRoute,
  isSettingsRoute,
  isChatRoute,
  extractChatId,
  codeSessionRoute,
  isCodeRoute,
  extractSessionId,
  isImageGenRoute,
} from './routes';

export {
  AppRouterProvider,
  useAppRouter,
  type AppRouterContextValue,
} from './RouterProvider';
