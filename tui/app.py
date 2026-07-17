from textual.app import App

from api_client import ApiClient
from screens.project_list import ProjectListScreen


class PortfolioAdminApp(App):
    TITLE = "Portfolio Admin"

    def on_mount(self) -> None:
        self.client = ApiClient()
        self.push_screen(ProjectListScreen())

    async def action_quit(self) -> None:
        await self.client.aclose()
        self.exit()


if __name__ == "__main__":
    PortfolioAdminApp().run()
