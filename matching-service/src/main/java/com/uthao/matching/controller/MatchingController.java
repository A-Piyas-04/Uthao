package com.uthao.matching.controller;

import com.uthao.matching.dto.FindDriverRequest;
import com.uthao.matching.dto.MatchResultDto;
import com.uthao.matching.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

    @PostMapping("/find-driver")
    public MatchResultDto findDriver(@RequestBody FindDriverRequest request) {
        return matchingService.findDriver(request);
    }
}
