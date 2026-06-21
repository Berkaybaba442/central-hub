package com.berkayhub.camera;

import jakarta.validation.constraints.NotBlank;

public class CameraDtos {
    public record CreateCameraRequest(@NotBlank String name, @NotBlank String location, String streamUrl, CameraStatus status) {}
}
