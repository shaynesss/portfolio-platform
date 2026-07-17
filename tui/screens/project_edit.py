from textual import on
from textual.app import ComposeResult
from textual.containers import Horizontal, VerticalScroll
from textual.screen import ModalScreen
from textual.widgets import Button, Input, Label, Select, Static, TextArea

from api_client import ApiClient, ApiError

MEDIA_TYPE_OPTIONS = [("image", "image"), ("video", "video")]
VIDEO_SOURCE_OPTIONS = [("youtube", "youtube"), ("self_hosted", "self_hosted")]


class ProjectEditScreen(ModalScreen[bool]):
    """Add or edit a single project. Dismisses with True if saved."""

    # Without this, focus lands on the VerticalScroll container itself
    # when the screen opens — typing does nothing until you manually
    # Tab or click into a field, which reads as "the form is broken".
    AUTO_FOCUS = "#slug"

    CSS = """
    ProjectEditScreen {
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
    #writeup {
        height: 10;
    }
    #error {
        color: $error;
        margin-top: 1;
    }
    #upload-row {
        height: auto;
    }
    #upload-row Input {
        width: 1fr;
    }
    #buttons {
        margin-top: 1;
        height: auto;
        align: right middle;
    }
    """

    def __init__(self, client: ApiClient, project: dict | None = None) -> None:
        super().__init__()
        self.client = client
        self.project = project

    def compose(self) -> ComposeResult:
        p = self.project or {}
        with VerticalScroll(id="panel"):
            yield Static("Edit project" if self.project else "Add project", id="title")

            yield Label("Slug")
            yield Input(value=p.get("slug", ""), id="slug")

            yield Label("Title")
            yield Input(value=p.get("title", ""), id="title-input")

            yield Label("Writeup")
            yield TextArea(p.get("writeup", ""), id="writeup")

            yield Label("GitHub URL")
            yield Input(value=p.get("githubUrl", ""), id="github-url")

            yield Label("Demo media type")
            yield Select(
                MEDIA_TYPE_OPTIONS,
                value=p.get("demoMediaType", "image"),
                allow_blank=False,
                id="demo-media-type",
            )

            yield Label("Demo media URL")
            yield Input(value=p.get("demoMediaUrl", ""), id="demo-media-url")

            yield Label(
                "...or upload a local file instead (drag it into the terminal "
                "to paste its path, then click Upload)"
            )
            with Horizontal(id="upload-row"):
                yield Input(placeholder="/path/to/file.png", id="local-file-path")
                yield Button("Upload", id="upload-file")

            yield Label("Video source (only used when media type is video)")
            yield Select(
                VIDEO_SOURCE_OPTIONS,
                value=p.get("videoSource") or Select.NULL,
                id="video-source",
            )

            yield Static("", id="error")

            with Horizontal(id="buttons"):
                yield Button("Cancel", id="cancel")
                yield Button("Save", variant="primary", id="save")

    @on(Button.Pressed, "#cancel")
    def cancel(self) -> None:
        self.dismiss(False)

    @on(Button.Pressed, "#upload-file")
    async def upload(self) -> None:
        error = self.query_one("#error", Static)
        path_input = self.query_one("#local-file-path", Input)
        file_path = path_input.value.strip()
        if not file_path:
            error.update("Enter a local file path to upload first.")
            return

        error.update("Uploading...")
        try:
            url = await self.client.upload_media(file_path)
        except ApiError as exc:
            error.update(f"Upload failed: {exc.detail}")
            # Clear + refocus even on failure: leftover text here is
            # the single biggest cause of "drag-and-drop worked once
            # then stopped" — dragging a new file in appends to
            # whatever's already there instead of replacing it, since
            # the terminal is just typing the path as keystrokes at
            # the cursor. Same for the success path below.
            path_input.value = ""
            path_input.focus()
            return

        self.query_one("#demo-media-url", Input).value = url
        path_input.value = ""
        path_input.focus()
        error.update(f"Uploaded — demo media URL set to {url}")

    @on(Button.Pressed, "#save")
    async def save(self) -> None:
        error = self.query_one("#error", Static)
        slug = self.query_one("#slug", Input).value.strip()
        title = self.query_one("#title-input", Input).value.strip()
        writeup = self.query_one("#writeup", TextArea).text.strip()
        github_url = self.query_one("#github-url", Input).value.strip()
        demo_media_url = self.query_one("#demo-media-url", Input).value.strip()
        demo_media_type = self.query_one("#demo-media-type", Select).value
        video_source_value = self.query_one("#video-source", Select).value
        video_source = None if video_source_value is Select.NULL else video_source_value

        if not all([slug, title, writeup, github_url, demo_media_url]):
            error.update("All fields except video source are required.")
            return

        payload = {
            "slug": slug,
            "title": title,
            "writeup": writeup,
            "githubUrl": github_url,
            "demoMediaType": demo_media_type,
            "demoMediaUrl": demo_media_url,
            "videoSource": video_source,
        }

        try:
            if self.project:
                await self.client.update_project(int(self.project["id"]), payload)
            else:
                await self.client.create_project(payload)
        except ApiError as exc:
            error.update(f"Save failed: {exc.detail}")
            return

        self.dismiss(True)
