package com.berkayhub.camera;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.berkayhub.camera.CameraDtos.*;

@RestController
@RequestMapping("/api/cameras")
@PreAuthorize("hasRole('ADMIN')")
public class CameraController {
    private final SecurityCameraRepository cameraRepository;

    public CameraController(SecurityCameraRepository cameraRepository) {
        this.cameraRepository = cameraRepository;
    }

    @GetMapping
    public List<SecurityCamera> cameras() {
        return cameraRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SecurityCamera createCamera(@Valid @RequestBody CreateCameraRequest request) {
        return cameraRepository.save(new SecurityCamera(request.name(), request.location(), request.streamUrl(), request.status()));
    }
}
