import { json } from "@remix-run/node";

export const loader = () => {
    return json({ status: "ok", message: "App is running!" });
};

export default function Health() {
    return (
        <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
            <h1>✅ App is Running!</h1>
            <p>Status: OK</p>
            <p>Time: {new Date().toISOString()}</p>
        </div>
    );
}
