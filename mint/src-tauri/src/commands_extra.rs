//! New Tauri commands added in the #289-#293 batch.

use serde::Serialize;
use tauri::ipc::Channel;

#[derive(Debug, Clone, Serialize)]
pub struct AppEventMetrics {
    pub snapshot: crate::metrics::MetricsSnapshot,
}

#[derive(Debug, Clone, Serialize)]
pub struct AppEventHeartbeat {
    pub ts: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event", rename_all = "snake_case")]
pub enum AppEvent {
    HotFolder {
        watcher_id: String,
        file_path: String,
        event_kind: String,
        message: String,
    },
    Metrics(AppEventMetrics),
    Heartbeat(AppEventHeartbeat),
}

#[tauri::command]
pub async fn subscribe_events(on_event: Channel<AppEvent>) -> Result<(), String> {
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    let stop = Arc::new(AtomicBool::new(false));
    let on_event_clone = on_event.clone();
    let stop_clone = stop.clone();
    tauri::async_runtime::spawn(async move {
        let mut tick = 0u64;
        while !stop_clone.load(Ordering::SeqCst) {
            tick = tick.wrapping_add(1);
            let ts = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            let event = if tick % 10 == 0 {
                AppEvent::Metrics(AppEventMetrics {
                    snapshot: crate::metrics::snapshot(),
                })
            } else {
                AppEvent::Heartbeat(AppEventHeartbeat { ts })
            };
            if on_event_clone.send(event).is_err() {
                break;
            }
            tauri::async_runtime::spawn_blocking(|| {
                std::thread::sleep(Duration::from_millis(500));
            })
            .await
            .ok();
        }
    });
    Ok(())
}

