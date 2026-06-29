mod analytics_cmds;
mod batch_cmds;
mod cache;
mod cloud_backup;
mod cloud_import;
mod comm_cmds;
mod commands;
pub mod commands_extra;
mod db;
mod db_cmds;
mod email;
mod finance_cmds;
mod finance_totals;
mod ftp;
mod import;
mod import_cmds;
mod invoice_pdf;
mod keychain;
mod logging;
pub mod metrics;
mod models;
mod observability;
mod pdf_cmds;
pub mod qb;
pub mod security;
mod settings_cmds;
mod workbook_cmds;

use db::Database;
use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir: PathBuf = app_handle
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            let logging_guard = logging::init_logging(&app_dir);
            app_handle.manage(logging_guard);
            tracing::info!("Mint starting up");

            let database = Database::new(app_dir.clone()).expect("failed to initialize database");

            let verification_result = database.verify_integrity();
            if !verification_result.is_valid {
                tracing::error!("Database verification failed");
                for error in &verification_result.errors {
                    tracing::error!("  ERROR: {}", error);
                }
            }
            if !verification_result.warnings.is_empty() {
                for warning in &verification_result.warnings {
                    tracing::warn!("  WARNING: {}", warning);
                }
            }

            app_handle.manage(database);

            metrics::record_cold_start();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Workbook
            workbook_cmds::create_workbook,
            workbook_cmds::list_workbooks,
            workbook_cmds::delete_workbook,
            workbook_cmds::get_workbook,
            workbook_cmds::create_sheet,
            workbook_cmds::add_column,
            workbook_cmds::update_cell_value,
            workbook_cmds::add_row,
            workbook_cmds::update_workbook_name,
            // Import
            import_cmds::import_csv_file,
            import_cmds::import_excel_file,
            import_cmds::import_google_sheet,
            import_cmds::import_notion_database,
            import_cmds::preview_import,
            // Database admin
            db_cmds::verify_database,
            db_cmds::get_schema_version,
            db_cmds::create_backup,
            db_cmds::list_backups,
            db_cmds::export_plaintext_backup,
            // Business
            commands::get_business_info,
            commands::save_business_info,
            commands::next_order_number,
            // Invoices
            commands::create_invoice,
            commands::list_invoices,
            commands::list_invoices_paginated,
            commands::get_invoice,
            commands::add_invoice_line_item,
            commands::replace_invoice_line_items,
            commands::update_invoice,
            // Orders
            commands::create_order,
            commands::list_orders,
            commands::list_orders_paginated,
            commands::get_order,
            commands::update_order_status,
            commands::update_order,
            // Estimates
            commands::create_estimate,
            commands::list_estimates,
            commands::get_estimate,
            commands::add_estimate_line_item,
            commands::replace_estimate_line_items,
            commands::update_estimate,
            // Inventory
            commands::add_inventory_item,
            commands::list_inventory_items,
            commands::get_inventory_item,
            commands::adjust_inventory,
            commands::get_low_stock_alerts,
            commands::acknowledge_alert,
            // Clients
            commands::create_client,
            commands::list_clients,
            commands::list_clients_paginated,
            commands::get_client,
            commands::update_client,
            commands::delete_client,
            // Art approvals
            commands::create_art_approval,
            commands::get_art_approvals_for_order,
            commands::respond_to_art_approval,
            commands::increment_art_approval_follow_up,
            // Payments
            commands::record_payment,
            commands::list_payments,
            commands::delete_payment,
            // Search
            commands::search_invoices_and_orders,
            // Invoice reminders
            commands::log_invoice_reminder,
            commands::list_invoice_reminders,
            // QuickBooks
            commands::update_invoice_qb_status,
            qb::cmds::qb_save_credentials,
            qb::cmds::qb_connection_status,
            qb::cmds::qb_start_oauth,
            qb::cmds::qb_disconnect,
            qb::cmds::sync_invoice_to_qb,
            // Finance
            finance_cmds::convert_estimate_to_invoice,
            finance_cmds::export_invoices_csv,
            finance_cmds::generate_invoice_pdf,
            finance_cmds::send_invoice_email,
            // Job specs & fulfillment
            commands::update_order_job_specs,
            commands::update_order_fulfillment,
            // Department notes
            commands::add_department_note,
            commands::list_department_notes,
            commands::delete_department_note,
            // Analytics
            analytics_cmds::get_analytics_summary,
            analytics_cmds::get_analytics_dashboard,
            // Communication
            comm_cmds::save_email_settings,
            comm_cmds::get_email_settings,
            comm_cmds::send_email,
            comm_cmds::save_ftp_settings,
            comm_cmds::get_ftp_settings,
            comm_cmds::ftp_upload,
            comm_cmds::create_webhook,
            comm_cmds::list_webhooks,
            comm_cmds::delete_webhook,
            // Cloud backup
            commands::upload_event_batch_cmd,
            commands::upload_snapshot_cmd,
            commands::get_cloud_backup_status,
            // Keychain
            commands::keychain_read,
            commands::keychain_write,
            commands::keychain_delete,
            // Observability
            commands::reveal_logs,
            commands::crash_report,
            commands::get_metrics_snapshot,
            // Preferences & alt text
            settings_cmds::get_preference,
            settings_cmds::set_preference,
            settings_cmds::get_all_preferences,
            settings_cmds::get_alt_text,
            settings_cmds::list_alt_text,
            settings_cmds::set_alt_text,
            // Events
            commands_extra::subscribe_events,
            // Batched IPC
            batch_cmds::batch_commands,
            // Stirling PDF sidecar
            pdf_cmds::stirling_health,
            pdf_cmds::stirling_info,
            pdf_cmds::stirling_start,
            pdf_cmds::pdf_to_images,
            pdf_cmds::images_to_pdf,
            pdf_cmds::pdf_merge,
            pdf_cmds::pdf_split,
            pdf_cmds::pdf_rotate,
            pdf_cmds::pdf_compress,
            pdf_cmds::pdf_add_stamp,
            pdf_cmds::pdf_rearrange_pages,
            pdf_cmds::pdf_print_preflight,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
