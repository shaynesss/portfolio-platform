from textual import on
from textual.app import ComposeResult
from textual.containers import Horizontal, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Button, Input, Label, Static, TextArea

from api_client import ApiClient, ApiError

BLOCK_MARKER = "## "


def blocks_to_text(blocks: list[dict]) -> str:
    return "\n\n".join(f"{BLOCK_MARKER}{b['heading']}\n{b['body']}" for b in blocks)


def text_to_blocks(text: str) -> list[dict]:
    blocks: list[dict] = []
    heading: str | None = None
    body_lines: list[str] = []

    def flush() -> None:
        if heading is not None:
            blocks.append({"heading": heading, "body": "\n".join(body_lines).strip()})

    for line in text.splitlines():
        if line.startswith(BLOCK_MARKER):
            flush()
            heading = line[len(BLOCK_MARKER):].strip()
            body_lines = []
        elif heading is not None:
            body_lines.append(line)
    flush()
    return blocks


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
                yield Static("Edit AI Workflow", id="heading")
                yield Label("Title")
                yield Input(value=self.content.get("title", ""), id="ai-title")
                yield Label("Intro")
                yield TextArea(self.content.get("intro", ""), id="intro")
                yield Label(
                    f"Blocks — one per section, each starting with '{BLOCK_MARKER}heading' "
                    "on its own line followed by the body text"
                )
                yield TextArea(
                    blocks_to_text(self.content.get("blocks", [])), id="blocks"
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
            blocks = text_to_blocks(self.query_one("#blocks", TextArea).text)
            if not title or not intro or not blocks:
                error.update("Title, intro, and at least one block are required.")
                return
            payload = {"title": title, "intro": intro, "blocks": blocks}

        try:
            await self.client.update_page(self.page_key, payload)
        except ApiError as exc:
            error.update(f"Save failed: {exc.detail}")
            return

        self.dismiss(True)
