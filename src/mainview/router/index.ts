// =============================================================================
// ROUTER
// =============================================================================

export {
  ROUTES,
  chatRoute,
  isSettingsRoute,
  isChatRoute,
  extractChatId,
} from './routes';

export {
  AppRouterProvider,
  useAppRouter,
  type AppRouterContextValue,
} from './RouterProvider';
