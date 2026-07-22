from textual import on
from textual.app import ComposeResult
from textual.containers import Horizontal, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Button, Input, Label, Static, TextArea

from api_client import ApiClient, ApiError


class PageEditScreen(ModalScreen[bool]):
    """Edit the About or AI Workflow singleton page. Dismisses True if saved."""

    CSS = """
    PageEditScreen {
        align: center middle;
    }
    #panel {
        width: 95%;
        height: 95%;
        border: round $accent;
        padding: 1 2;
        background: $surface;
    }
    #panel Label {
        margin-top: 1;
    }
    #panel TextArea {
        height: 12;
    }
    #blocks {
        height: 24;
    }
    #error {
        color: $error;
        margin-top: 1;
    }
    #buttons {
        margin-top: 1;
        height: auto;
        align: right middle;
    }
    """

    def __init__(self, client: ApiClient, page_key: str, content: dict) -> None:
        super().__init__()
        self.client = client
        self.page_key = page_key
        self.content = content

    def on_mount(self) -> None:
        # Without this, focus lands on the VerticalScroll container
        # itself and typing does nothing until you manually Tab or
        # click into a field.
        first_field = "body" if self.page_key == "about" else "ai-title"
        self.set_focus(self.query_one(f"#{first_field}"))

    def compose(self) -> ComposeResult:
        with VerticalScroll(id="panel"):
            if self.page_key == "about":
                yield Static("Edit About", id="heading")
                yield Label("Body")
                yield TextArea(self.content.get("body", ""), id="body")
                yield Label("LinkedIn URL")
                yield Input(value=self.content.get("linkedinUrl", ""), id="linkedin-url")
                yield Label("Devpost URL")
                yield Input(value=self.content.get("devpostUrl", ""), id="devpost-url")
                yield Label("GitHub URL")
                yield Input(value=self.content.get("githubUrl") or "", id="github-url")
            else:
                repo_card = self.content.get("repoCard", {})
                yield Static("Edit AI Workflow", id="heading")
                yield Label("Title")
                yield Input(value=self.content.get("title", ""), id="ai-title")
                yield Label("Intro / writeup")
                yield TextArea(self.content.get("intro", ""), id="intro")
                yield Label("Repo card — title")
                yield Input(value=repo_card.get("title", ""), id="repo-title")
                yield Label("Repo card — writeup (shown when the card expands)")
                yield TextArea(repo_card.get("writeup", ""), id="repo-writeup")
                yield Label("Repo card — GitHub URL (stats refresh on save)")
                yield Input(value=repo_card.get("githubUrl", ""), id="repo-github-url")
                yield Label("Repo card — demo media URL (image)")
                yield Input(
                    value=repo_card.get("demoMediaUrl", ""), id="repo-demo-media-url"
                )

            yield Static("", id="error")

            with Horizontal(id="buttons"):
                yield Button("Cancel", id="cancel")
                yield Button("Save", variant="primary", id="save")

    @on(Button.Pressed, "#cancel")
    def cancel(self) -> None:
        self.dismiss(False)

    @on(Button.Pressed, "#save")
    async def save(self) -> None:
        error = self.query_one("#error", Static)

        if self.page_key == "about":
            body = self.query_one("#body", TextArea).text.strip()
            linkedin_url = self.query_one("#linkedin-url", Input).value.strip()
            devpost_url = self.query_one("#devpost-url", Input).value.strip()
            github_url = self.query_one("#github-url", Input).value.strip()
            if not all([body, linkedin_url, devpost_url, github_url]):
                error.update("All fields are required.")
                return
            payload = {
                "body": body,
                "linkedinUrl": linkedin_url,
                "devpostUrl": devpost_url,
                "githubUrl": github_url,
            }
        else:
            title = self.query_one("#ai-title", Input).value.strip()
            intro = self.query_one("#intro", TextArea).text.strip()
            repo_title = self.query_one("#repo-title", Input).value.strip()
            repo_writeup = self.query_one("#repo-writeup", TextArea).text.strip()
            repo_github_url = self.query_one("#repo-github-url", Input).value.strip()
            repo_demo_media_url = self.query_one(
                "#repo-demo-media-url", Input
            ).value.strip()
            if not all(
                [title, intro, repo_title, repo_writeup, repo_github_url, repo_demo_media_url]
            ):
                error.update("All AI Workflow fields are required.")
                return
            payload = {
                "title": title,
                "intro": intro,
                "repoCard": {
                    "title": repo_title,
                    "writeup": repo_writeup,
                    "githubUrl": repo_github_url,
                    "demoMediaUrl": repo_demo_media_url,
                },
            }

        try:
            await self.client.update_page(self.page_key, payload)
        except ApiError as exc:
            error.update(f"Save failed: {exc.detail}")
            return

        self.dismiss(True)
