package com.berkayhub.camera;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "security_cameras")
public class SecurityCamera {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(nullable = false)
    private String name;
    @NotBlank @Column(nullable = false)
    private String location;
    @Column(length = 1000)
    private String streamUrl;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CameraStatus status = CameraStatus.OFFLINE;

    public SecurityCamera() {}
    public SecurityCamera(String name, String location, String streamUrl, CameraStatus status) {
        this.name = name;
        this.location = location;
        this.streamUrl = streamUrl;
        this.status = status == null ? CameraStatus.OFFLINE : status;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }
    public CameraStatus getStatus() { return status; }
    public void setStatus(CameraStatus status) { this.status = status; }
}
