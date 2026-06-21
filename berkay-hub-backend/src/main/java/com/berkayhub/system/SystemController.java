package com.berkayhub.system;

import com.berkayhub.auth.TokenStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemController {
    private final TokenStore tokenStore;

    public SystemController(TokenStore tokenStore) {
        this.tokenStore = tokenStore;
    }

    @GetMapping("/metrics")
    public Map<String, Object> metrics() {
        Runtime runtime = Runtime.getRuntime();
        long freeMb = runtime.freeMemory() / 1024 / 1024;
        long totalMb = runtime.totalMemory() / 1024 / 1024;
        double load = ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("cpuLoadAverage", load < 0 ? "unknown" : Math.round(load * 100.0) / 100.0);
        data.put("freeMemoryMb", freeMb);
        data.put("totalMemoryMb", totalMb);
        data.put("activeUsers", tokenStore.activeCount());
        data.put("networkStatus", "Local API online / Cloudflare Tunnel config hazır");
        return data;
    }
}
