from textual import work
from textual.app import ComposeResult
from textual.binding import Binding
from textual.screen import Screen
from textual.widgets import DataTable, Footer, Header

from api_client import ApiError
from screens.page_edit import PageEditScreen
from screens.project_edit import ProjectEditScreen

MAX_PROJECTS = 6


class ProjectListScreen(Screen):
    BINDINGS = [
        Binding("n", "add_project", "Add project"),
        Binding("enter", "edit_project", "Edit"),
        Binding("d", "delete_project", "Delete"),
        Binding("g", "refresh_github", "Refresh GitHub"),
        Binding("[", "move_up", "Move up"),
        Binding("]", "move_down", "Move down"),
        Binding("b", "edit_about", "Edit About"),
        Binding("w", "edit_ai_workflow", "Edit AI Workflow"),
        Binding("q", "quit", "Quit"),
    ]

    _projects: list[dict] = []

    def compose(self) -> ComposeResult:
        yield Header()
        yield DataTable(id="projects")
        yield Footer()

    async def on_mount(self) -> None:
        table = self.query_one(DataTable)
        table.cursor_type = "row"
        table.add_columns("Order", "Title", "Slug", "Stars", "Language", "Media")
        await self.refresh_projects()

    async def refresh_projects(self) -> None:
        table = self.query_one(DataTable)
        table.clear()
        try:
            projects = await self.app.client.get_projects()
        except ApiError as exc:
            self.notify(f"Failed to load projects: {exc.detail}", severity="error")
            return

        self._projects = projects
        for p in projects:
            table.add_row(
                p["displayOrder"],
                p["title"],
                p["slug"],
                p["githubStars"],
                p["githubLanguage"] or "—",
                p["demoMediaType"],
                key=p["id"],
            )

    def _selected_project(self) -> dict | None:
        table = self.query_one(DataTable)
        if table.cursor_row is None or not self._projects:
            return None
        row_key, _ = table.coordinate_to_cell_key(table.cursor_coordinate)
        return next((p for p in self._projects if p["id"] == row_key.value), None)

    @work
    async def action_add_project(self) -> None:
        if len(self._projects) >= MAX_PROJECTS:
            self.notify(f"Already at the {MAX_PROJECTS}-project limit.", severity="warning")
            return
        saved = await self.app.push_screen_wait(ProjectEditScreen(self.app.client))
        if saved:
            await self.refresh_projects()

    @work
    async def action_edit_project(self) -> None:
        project = self._selected_project()
        if not project:
            return
        saved = await self.app.push_screen_wait(ProjectEditScreen(self.app.client, project))
        if saved:
            await self.refresh_projects()

    async def action_delete_project(self) -> None:
        project = self._selected_project()
        if not project:
            return
        try:
            await self.app.client.delete_project(int(project["id"]))
        except ApiError as exc:
            self.notify(f"Delete failed: {exc.detail}", severity="error")
            return
        self.notify(f"Deleted {project['title']}")
        await self.refresh_projects()

    async def action_refresh_github(self) -> None:
        project = self._selected_project()
        if not project:
            return
        try:
            await self.app.client.refresh_github(int(project["id"]))
        except ApiError as exc:
            self.notify(f"GitHub refresh failed: {exc.detail}", severity="error")
            return
        self.notify(f"Refreshed GitHub stats for {project['title']}")
        await self.refresh_projects()

    async def _move_selected(self, delta: int) -> None:
        project = self._selected_project()
        if not project:
            return
        ids = [p["id"] for p in self._projects]
        index = ids.index(project["id"])
        new_index = index + delta
        if not (0 <= new_index < len(ids)):
            return
        ids[index], ids[new_index] = ids[new_index], ids[index]
        try:
            await self.app.client.reorder_projects([int(i) for i in ids])
        except ApiError as exc:
            self.notify(f"Reorder failed: {exc.detail}", severity="error")
            return
        await self.refresh_projects()

    async def action_move_up(self) -> None:
        await self._move_selected(-1)

    async def action_move_down(self) -> None:
        await self._move_selected(1)

    async def action_edit_about(self) -> None:
        try:
            content = await self.app.client.get_page("about")
        except ApiError as exc:
            self.notify(f"Failed to load About: {exc.detail}", severity="error")
            return
        self.app.push_screen(PageEditScreen(self.app.client, "about", content))

    async def action_edit_ai_workflow(self) -> None:
        try:
            content = await self.app.client.get_page("ai-workflow")
        except ApiError as exc:
            self.notify(f"Failed to load AI Workflow: {exc.detail}", severity="error")
            return
        self.app.push_screen(PageEditScreen(self.app.client, "ai-workflow", content))
