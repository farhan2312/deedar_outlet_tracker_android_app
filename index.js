// App entry. The background location task has to be registered before
// anything else loads — Android may start the app only to deliver locations,
// with no screen mounted — so it is imported ahead of Expo Router.
import './src/lib/tracking/background-task';
import 'expo-router/entry';
