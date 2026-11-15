package io.github.dante3750.twominds.screens

import androidx.compose.runtime.Composable
import io.github.dante3750.twominds.data.Match
import io.github.dante3750.twominds.ui.H1
import io.github.dante3750.twominds.ui.Page

// placeholders, replaced screen by screen
@Composable private fun Soon(t: String) = Page { TopBar(); H1(t) }
@Composable fun HomeScreen() = Page(tabs = true) { H1("Home") }
@Composable fun TopicsScreen() = Page(tabs = true) { H1("Topics") }
@Composable fun FriendsScreen() = Page(tabs = true) { H1("Friends") }
@Composable fun MeScreen() = Page(tabs = true) { H1("Profile") }
@Composable fun HistoryScreen() = Soon("History")
@Composable fun CoupleScreen() = Soon("Couple")
@Composable fun SuggestScreen() = Soon("Suggest")
@Composable fun AdminScreen() = Soon("Admin")
@Composable fun TopicScreen(id: String) = Soon(id)
@Composable fun PlayScreen(m: Match) = Soon(m.id)
@Composable fun ResultsScreen(id: String) = Soon(id)
@Composable fun SearchScreen(topic: String) = Soon(topic)
@Composable fun LobbyScreen(m: Match) = Soon(m.id)
@Composable fun DetailScreen(id: String) = Soon(id)
@Composable fun PlayerScreen(id: String) = Soon(id)
@Composable fun ChallengeScreen(id: String) = Soon(id)
@Composable fun CoupleGameScreen(kind: String, partner: String) = Soon(kind + partner)
