import { useColorScheme, StyleSheet, View, ActivityIndicator } from "react-native";
import WebView from "react-native-webview";
import { Session } from "@/lib/types";
import { Colors } from "@/constants/colors";

function notesToHtml(notes: string, isDark: boolean): string {
  const isHtml = notes.trimStart().startsWith("<");
  const body = isHtml ? notes : markdownToHtml(notes);
  const bg = isDark ? "#0F172A" : "#FFFFFF";
  const fg = isDark ? "#F1F5F9" : "#111827";
  const subtext = isDark ? "#94A3B8" : "#6B7280";
  const border = isDark ? "#334155" : "#E5E7EB";
  const codebg = isDark ? "#1E293B" : "#F3F4F6";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px; line-height: 1.7;
    color: ${fg}; background: ${bg};
    padding: 20px 18px 40px; word-break: break-word;
  }
  h1 { font-size: 22px; font-weight: 700; margin: 20px 0 10px; color: ${fg}; }
  h2 { font-size: 18px; font-weight: 700; margin: 18px 0 8px; color: ${fg};
       border-bottom: 1px solid ${border}; padding-bottom: 6px; }
  h3 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; color: ${fg}; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 20px; margin: 8px 0; }
  li { margin: 4px 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  code { background: ${codebg}; padding: 2px 5px; border-radius: 4px; font-size: 13px; }
  pre { background: ${codebg}; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 10px 0; }
  blockquote { border-left: 3px solid #3B82F6; padding-left: 12px; color: ${subtext}; margin: 10px 0; }
  hr { border: none; border-top: 1px solid ${border}; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid ${border}; padding: 8px 10px; text-align: left; }
  th { background: ${codebg}; font-weight: 600; }
</style>
</head>
<body>${body}</body>
</html>`;
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/^(?!<[hul]|<hr|<p)(.+)$/gm, "<p>$1</p>");
}

export default function NotesTab({ session }: { session: Session }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const html = notesToHtml(session.notes, isDark);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: c.background }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}
        scrollEnabled
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" } as any,
});
