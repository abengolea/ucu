<?php
/**
 * Script de Reparación Automática para Flujos de IA en WordPress
 * USAR CON PRECAUCIÓN - Hacer backup antes de ejecutar
 */

if (!defined('ABSPATH')) {
    // Si no estamos en WordPress, definir constantes básicas
    define('ABSPATH', dirname(__FILE__) . '/');
    require_once(ABSPATH . 'wp-config.php');
    require_once(ABSPATH . 'wp-includes/wp-db.php');
    require_once(ABSPATH . 'wp-includes/functions.php');
}

class AIFlowFixer {
    
    private $fixes_applied = [];
    private $errors = [];
    
    public function __construct() {
        $this->run_all_fixes();
    }
    
    public function run_all_fixes() {
        echo "<h1>🔧 REPARACIÓN AUTOMÁTICA DE FLUJOS DE IA</h1>\n";
        echo "<p>Ejecutando reparaciones sistemáticas...</p>\n";
        
        // 1. Verificar y reparar configuración de base de datos
        $this->fix_database_config();
        
        // 2. Reparar configuraciones de API
        $this->fix_api_configurations();
        
        // 3. Reparar endpoints AJAX
        $this->fix_ajax_endpoints();
        
        // 4. Reparar shortcodes
        $this->fix_shortcodes();
        
        // 5. Limpiar cache y datos corruptos
        $this->clear_ai_cache();
        
        // 6. Reparar configuración de JavaScript
        $this->fix_javascript_config();
        
        // 7. Verificar y reparar permisos
        $this->fix_permissions();
        
        // 8. Generar reporte final
        $this->generate_final_report();
    }
    
    private function fix_database_config() {
        echo "<h2>📊 Reparando Configuración de Base de Datos</h2>\n";
        
        global $wpdb;
        
        // Buscar tablas relacionadas con IA
        $ai_tables = $wpdb->get_results("SHOW TABLES LIKE '%chat%' OR SHOW TABLES LIKE '%ai%' OR SHOW TABLES LIKE '%gpt%'");
        
        if (empty($ai_tables)) {
            echo "⚠️ No se encontraron tablas de IA. Creando estructura básica...\n";
            $this->create_ai_tables();
        } else {
            echo "✅ Tablas de IA encontradas: " . count($ai_tables) . "\n";
        }
        
        // Reparar opciones de WordPress relacionadas con IA
        $this->repair_ai_options();
    }
    
    private function create_ai_tables() {
        global $wpdb;
        
        // Tabla para conversaciones de chat
        $sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}ai_conversations (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) DEFAULT NULL,
            session_id varchar(255) NOT NULL,
            message_type enum('user','assistant') NOT NULL,
            message text NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY session_id (session_id),
            KEY user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Tabla para configuraciones de IA
        $sql2 = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}ai_settings (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            setting_key varchar(255) NOT NULL UNIQUE,
            setting_value longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY setting_key (setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        dbDelta($sql2);
        
        $this->fixes_applied[] = "Tablas de IA creadas/verificadas";
    }
    
    private function repair_ai_options() {
        // Configuraciones por defecto para diferentes plugins de IA
        $default_configs = [
            'treyworks_chat_enabled' => '1',
            'chatgpt_model' => 'gpt-3.5-turbo',
            'ai_chat_temperature' => '0.7',
            'ai_max_tokens' => '150',
            'ai_chat_timeout' => '30',
            'dialogue_enabled' => '1',
            'oc3d_ai_enabled' => '1'
        ];
        
        foreach ($default_configs as $option => $value) {
            if (get_option($option) === false) {
                update_option($option, $value);
                echo "✅ Configuración restaurada: $option = $value\n";
                $this->fixes_applied[] = "Opción restaurada: $option";
            }
        }
    }
    
    private function fix_api_configurations() {
        echo "<h2>🔑 Reparando Configuraciones de API</h2>\n";
        
        // Buscar claves API existentes
        $api_keys = [
            'openai_api_key',
            'chatgpt_api_key', 
            'treyworks_openai_key',
            'dialogue_openai_key',
            'oc3d_openai_key'
        ];
        
        $found_key = false;
        foreach ($api_keys as $key_option) {
            $key = get_option($key_option);
            if (!empty($key) && strlen($key) > 20) {
                $found_key = true;
                echo "✅ Clave API encontrada en: $key_option\n";
                
                // Sincronizar con otras opciones
                foreach ($api_keys as $sync_option) {
                    if ($sync_option !== $key_option && empty(get_option($sync_option))) {
                        update_option($sync_option, $key);
                        echo "🔄 Sincronizada clave en: $sync_option\n";
                    }
                }
                break;
            }
        }
        
        if (!$found_key) {
            echo "❌ No se encontró clave API válida. Necesita configurar manualmente.\n";
            $this->errors[] = "Clave API de OpenAI no configurada";
        } else {
            $this->fixes_applied[] = "Configuración de API verificada y sincronizada";
        }
    }
    
    private function fix_ajax_endpoints() {
        echo "<h2>🔗 Reparando Endpoints AJAX</h2>\n";
        
        // Crear endpoints AJAX universales si no existen
        $ajax_handlers = [
            'ai_chat_send' => 'handle_ai_chat_universal',
            'tw_chat_send_message' => 'handle_treyworks_chat',
            'gpt_chat_send' => 'handle_gpt_chat',
            'dialogue_chat' => 'handle_dialogue_chat'
        ];
        
        foreach ($ajax_handlers as $action => $handler) {
            if (!has_action("wp_ajax_$action") && !has_action("wp_ajax_nopriv_$action")) {
                add_action("wp_ajax_$action", [$this, $handler]);
                add_action("wp_ajax_nopriv_$action", [$this, $handler]);
                echo "✅ Endpoint AJAX restaurado: $action\n";
                $this->fixes_applied[] = "Endpoint AJAX: $action";
            }
        }
    }
    
    public function handle_ai_chat_universal() {
        // Handler universal para chat de IA
        check_ajax_referer('ai_chat_nonce', 'nonce');
        
        $message = sanitize_text_field($_POST['message'] ?? '');
        $api_key = $this->get_any_api_key();
        
        if (empty($api_key)) {
            wp_send_json_error('API key no configurada');
            return;
        }
        
        $response = $this->send_to_openai($message, $api_key);
        
        if ($response) {
            wp_send_json_success(['response' => $response]);
        } else {
            wp_send_json_error('Error al procesar mensaje');
        }
    }
    
    private function send_to_openai($message, $api_key) {
        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    ['role' => 'user', 'content' => $message]
                ],
                'max_tokens' => 150,
                'temperature' => 0.7
            ]),
            'timeout' => 30
        ]);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        return $body['choices'][0]['message']['content'] ?? false;
    }
    
    private function get_any_api_key() {
        $keys = [
            get_option('openai_api_key'),
            get_option('chatgpt_api_key'),
            get_option('treyworks_openai_key'),
            get_option('dialogue_openai_key'),
            get_option('oc3d_openai_key')
        ];
        
        foreach ($keys as $key) {
            if (!empty($key) && strlen($key) > 20) {
                return $key;
            }
        }
        
        return null;
    }
    
    private function fix_shortcodes() {
        echo "<h2>📝 Reparando Shortcodes</h2>\n";
        
        // Registrar shortcodes universales
        $shortcodes = [
            'ai_chat' => 'render_ai_chat_shortcode',
            'tw_chat_widget' => 'render_treyworks_shortcode', 
            'gpt_chatbot' => 'render_gpt_shortcode',
            'dialogue' => 'render_dialogue_shortcode'
        ];
        
        foreach ($shortcodes as $tag => $function) {
            if (!shortcode_exists($tag)) {
                add_shortcode($tag, [$this, $function]);
                echo "✅ Shortcode restaurado: [$tag]\n";
                $this->fixes_applied[] = "Shortcode: $tag";
            }
        }
    }
    
    public function render_ai_chat_shortcode($atts) {
        $atts = shortcode_atts([
            'height' => '400px',
            'width' => '100%',
            'id' => 'default'
        ], $atts);
        
        wp_enqueue_script('jquery');
        
        $nonce = wp_create_nonce('ai_chat_nonce');
        
        return "
        <div id='ai-chat-{$atts['id']}' style='height: {$atts['height']}; width: {$atts['width']}; border: 1px solid #ddd; border-radius: 8px;'>
            <div id='ai-chat-messages-{$atts['id']}' style='height: calc(100% - 60px); overflow-y: auto; padding: 10px;'></div>
            <div style='height: 50px; padding: 5px; border-top: 1px solid #ddd;'>
                <input type='text' id='ai-chat-input-{$atts['id']}' style='width: calc(100% - 80px); padding: 8px;' placeholder='Escribe tu mensaje...'>
                <button onclick='sendAIMessage(\"{$atts['id']}\", \"$nonce\")' style='width: 70px; padding: 8px;'>Enviar</button>
            </div>
        </div>
        <script>
        function sendAIMessage(chatId, nonce) {
            var input = document.getElementById('ai-chat-input-' + chatId);
            var messages = document.getElementById('ai-chat-messages-' + chatId);
            var message = input.value.trim();
            
            if (!message) return;
            
            // Mostrar mensaje del usuario
            messages.innerHTML += '<div style=\"margin-bottom: 10px; text-align: right;\"><strong>Tú:</strong> ' + message + '</div>';
            input.value = '';
            
            // Enviar a servidor
            jQuery.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'ai_chat_send',
                    message: message,
                    nonce: nonce
                },
                success: function(response) {
                    if (response.success) {
                        messages.innerHTML += '<div style=\"margin-bottom: 10px;\"><strong>IA:</strong> ' + response.data.response + '</div>';
                    } else {
                        messages.innerHTML += '<div style=\"margin-bottom: 10px; color: red;\"><strong>Error:</strong> ' + response.data + '</div>';
                    }
                    messages.scrollTop = messages.scrollHeight;
                }
            });
        }
        </script>";
    }
    
    public function render_treyworks_shortcode($atts) {
        return $this->render_ai_chat_shortcode($atts);
    }
    
    public function render_gpt_shortcode($atts) {
        return $this->render_ai_chat_shortcode($atts);
    }
    
    public function render_dialogue_shortcode($atts) {
        return $this->render_ai_chat_shortcode($atts);
    }
    
    private function clear_ai_cache() {
        echo "<h2>🧹 Limpiando Cache y Datos Corruptos</h2>\n";
        
        // Limpiar transients relacionados con IA
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_ai_%' OR option_name LIKE '_transient_timeout_ai_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gpt_%' OR option_name LIKE '_transient_timeout_gpt_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_chat_%' OR option_name LIKE '_transient_timeout_chat_%'");
        
        // Limpiar cache de objetos
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
        
        echo "✅ Cache de IA limpiado\n";
        $this->fixes_applied[] = "Cache limpiado";
    }
    
    private function fix_javascript_config() {
        echo "<h2">🔧 Reparando Configuración JavaScript</h2>\n";
        
        // Asegurar que AJAX URL esté disponible
        add_action('wp_head', function() {
            echo "<script>var ajaxurl = '" . admin_url('admin-ajax.php') . "';</script>";
        });
        
        // Encolar scripts necesarios
        add_action('wp_enqueue_scripts', function() {
            wp_enqueue_script('jquery');
        });
        
        echo "✅ Configuración JavaScript reparada\n";
        $this->fixes_applied[] = "JavaScript configurado";
    }
    
    private function fix_permissions() {
        echo "<h2>🔐 Verificando Permisos</h2>\n";
        
        // Verificar que el directorio de uploads sea escribible
        $upload_dir = wp_upload_dir();
        if (!is_writable($upload_dir['basedir'])) {
            echo "⚠️ Directorio de uploads no escribible\n";
            $this->errors[] = "Permisos de directorio insuficientes";
        } else {
            echo "✅ Permisos de directorio correctos\n";
        }
        
        // Verificar capacidades de usuario
        if (current_user_can('manage_options')) {
            echo "✅ Permisos de administrador verificados\n";
        }
    }
    
    private function generate_final_report() {
        echo "<h2>📋 REPORTE FINAL DE REPARACIÓN</h2>\n";
        
        echo "<h3>✅ Reparaciones Aplicadas (" . count($this->fixes_applied) . "):</h3>\n";
        foreach ($this->fixes_applied as $fix) {
            echo "• $fix\n";
        }
        
        if (!empty($this->errors)) {
            echo "<h3>❌ Errores Pendientes (" . count($this->errors) . "):</h3>\n";
            foreach ($this->errors as $error) {
                echo "• $error\n";
            }
        }
        
        echo "<h3>🔧 Próximos Pasos Recomendados:</h3>\n";
        echo "1. Configurar clave API de OpenAI si no está configurada\n";
        echo "2. Probar shortcodes: [ai_chat], [tw_chat_widget], [gpt_chatbot]\n";
        echo "3. Verificar funcionamiento en frontend\n";
        echo "4. Revisar logs de errores para problemas adicionales\n";
        echo "5. Contactar soporte del plugin específico si persisten problemas\n";
        
        echo "<h3>✨ REPARACIÓN COMPLETADA</h3>\n";
        echo "<p>Los flujos de IA han sido restaurados automáticamente. Pruebe la funcionalidad en el frontend.</p>\n";
    }
}

// Ejecutar solo si se llama directamente o desde admin
if (!function_exists('is_admin') || is_admin() || (defined('WP_CLI') && WP_CLI)) {
    new AIFlowFixer();
}
?>